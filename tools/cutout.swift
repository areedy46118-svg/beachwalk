// Cuts the subject out of a photo and writes a transparent PNG, using the
// Vision person-segmentation model that ships with macOS. No dependencies.
//
//   swift tools/cutout.swift <in.jpg> <out.png> [maxHeight]
//
// Used to make assets/bradly.png from a beach photo. The result is trimmed
// to the subject's bounding box so the sprite has no dead margin — main.js
// sizes him from the image's own aspect ratio.

import Foundation
import CoreImage
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: cutout.swift <in> <out.png> [maxHeight]\n".data(using: .utf8)!)
    exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let maxH = args.count > 3 ? (Double(args[3]) ?? 0) : 0

guard let src = CIImage(contentsOf: inURL) else {
    FileHandle.standardError.write("could not read \(inURL.path)\n".data(using: .utf8)!)
    exit(1)
}
let extent = src.extent

// --- person mask -----------------------------------------------------
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

let handler = VNImageRequestHandler(ciImage: src, options: [:])
do { try handler.perform([request]) } catch {
    FileHandle.standardError.write("vision failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
guard let maskBuf = (request.results?.first)?.pixelBuffer else {
    FileHandle.standardError.write("no person found in the image\n".data(using: .utf8)!)
    exit(1)
}

var mask = CIImage(cvPixelBuffer: maskBuf)
// the mask comes back at the model's own resolution — stretch it to the photo
mask = mask.transformed(by: CGAffineTransform(
    scaleX: extent.width / mask.extent.width,
    y: extent.height / mask.extent.height))

// punch the mask into the alpha channel over transparency
guard let blend = CIFilter(name: "CIBlendWithMask") else { exit(1) }
blend.setValue(src, forKey: kCIInputImageKey)
blend.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
blend.setValue(mask, forKey: kCIInputMaskImageKey)
guard var cut = blend.outputImage else { exit(1) }
cut = cut.cropped(to: extent)

let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
guard let cg = ctx.createCGImage(cut, from: extent) else { exit(1) }

// --- trim to the subject's bounding box -------------------------------
let w = cg.width, h = cg.height
var pixels = [UInt8](repeating: 0, count: w * h * 4)
guard let bmp = CGContext(data: &pixels, width: w, height: h, bitsPerComponent: 8,
                          bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(),
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
bmp.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))

var minX = w, minY = h, maxX = -1, maxY = -1
for y in 0..<h {
    for x in 0..<w where pixels[(y * w + x) * 4 + 3] > 12 {
        if x < minX { minX = x }; if x > maxX { maxX = x }
        if y < minY { minY = y }; if y > maxY { maxY = y }
    }
}
guard maxX >= minX, maxY >= minY else {
    FileHandle.standardError.write("mask was empty\n".data(using: .utf8)!)
    exit(1)
}
let pad = 2
minX = max(0, minX - pad); minY = max(0, minY - pad)
maxX = min(w - 1, maxX + pad); maxY = min(h - 1, maxY + pad)
let cropRect = CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
guard var trimmed = cg.cropping(to: cropRect) else { exit(1) }

// --- optional downscale ----------------------------------------------
if maxH > 0 && Double(trimmed.height) > maxH {
    let scale = maxH / Double(trimmed.height)
    let nw = Int((Double(trimmed.width) * scale).rounded())
    let nh = Int(maxH.rounded())
    guard let rc = CGContext(data: nil, width: nw, height: nh, bitsPerComponent: 8,
                             bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                             bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(1) }
    rc.interpolationQuality = .high
    rc.draw(trimmed, in: CGRect(x: 0, y: 0, width: nw, height: nh))
    guard let out = rc.makeImage() else { exit(1) }
    trimmed = out
}

let rep = NSBitmapImageRep(cgImage: trimmed)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: outURL)
print("wrote \(outURL.lastPathComponent) — \(trimmed.width)x\(trimmed.height), \(png.count / 1024) KB")

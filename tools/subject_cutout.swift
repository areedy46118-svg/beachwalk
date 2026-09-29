// Cuts the SUBJECT out of a photo — any object, not only a person — with the
// foreground-instance model that ships with macOS 14+ (what "Lift subject"
// in Photos uses). No dependencies.
//
//   swift tools/subject_cutout.swift <in> <out.png> [upscale]
//
// `tools/cutout.swift` is person segmentation and finds nothing on a plaque;
// colour keying (tools/plaque_cutout.py) cannot tell a white chin from the
// white wall behind it, which is the wedge of wall Billy's jaw carried. This
// asks the model what the object is instead. The output is the photo at its
// own size (times `upscale`) with the mask in its alpha — not trimmed, so a
// caller can register it however it likes.

import Foundation
import CoreImage
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: subject_cutout.swift <in> <out.png> [upscale]\n".data(using: .utf8)!)
    exit(2)
}
let inURL = URL(fileURLWithPath: args[1])
let outURL = URL(fileURLWithPath: args[2])
let up = args.count > 3 ? (Double(args[3]) ?? 1) : 1

guard var src = CIImage(contentsOf: inURL) else {
    FileHandle.standardError.write("could not read \(inURL.path)\n".data(using: .utf8)!)
    exit(1)
}
if up != 1 {
    let f = CIFilter(name: "CILanczosScaleTransform")!
    f.setValue(src, forKey: kCIInputImageKey)
    f.setValue(up, forKey: kCIInputScaleKey)
    f.setValue(1.0, forKey: kCIInputAspectRatioKey)
    src = f.outputImage!
    src = src.transformed(by: CGAffineTransform(translationX: -src.extent.origin.x, y: -src.extent.origin.y))
}
let extent = src.extent
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
guard let srcCG = ctx.createCGImage(src, from: extent) else { exit(1) }

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: srcCG, options: [:])
do { try handler.perform([request]) } catch {
    FileHandle.standardError.write("vision failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
guard let obs = request.results?.first else {
    FileHandle.standardError.write("no subject found\n".data(using: .utf8)!)
    exit(1)
}
let maskBuf: CVPixelBuffer
do {
    // every instance the model found, scaled to the photo
    maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
} catch {
    FileHandle.standardError.write("mask failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
let mask = CIImage(cvPixelBuffer: maskBuf)

guard let blend = CIFilter(name: "CIBlendWithMask") else { exit(1) }
blend.setValue(CIImage(cgImage: srcCG), forKey: kCIInputImageKey)
blend.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
blend.setValue(mask, forKey: kCIInputMaskImageKey)
guard let cut = blend.outputImage?.cropped(to: extent) else { exit(1) }
guard let cg = ctx.createCGImage(cut, from: extent) else { exit(1) }

let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
do { try png.write(to: outURL) } catch {
    FileHandle.standardError.write("write failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
print("wrote \(outURL.path) \(Int(extent.width))x\(Int(extent.height)) instances \(obs.allInstances.count)")

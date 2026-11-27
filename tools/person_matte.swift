// A SOFT PERSON MATTE per frame (2026-11-26, the owner: "trim the hand better when grabbing from the sewer screw driver", "make the
// trim on the leg way better too"). The foreground-instance labels (`scene_cutout.swift labels`) are 512 x 512 for a 640 x 1138
// frame — squashed, blocky, nearest-upscaled: the fingers came out fused and the tips chewed. Vision's person segmentation at
// `.accurate` gives a soft matte of a body part however little of the body is in shot (an arm, a leg), at its own higher
// resolution; it is written as an 8-bit grey png at the FRAME's size (CoreImage bilinear) for `tools/cut_refine.py`.
//
//   swift tools/person_matte.swift <indir of .png> <outdir> [first] [last]      (frames named NNN.png; the range is optional)
import Foundation
import CoreImage
import Vision
import AppKit

let a = CommandLine.arguments
let inDir = URL(fileURLWithPath: a[1]), outDir = URL(fileURLWithPath: a[2])
let lo = a.count > 3 ? Int(a[3])! : 0, hi = a.count > 4 ? Int(a[4])! : 99999
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let names = (try FileManager.default.contentsOfDirectory(atPath: inDir.path)).filter { $0.hasSuffix(".png") }.sorted()
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
for name in names {
    let n = Int(name.replacingOccurrences(of: ".png", with: "")) ?? -1
    if n < lo || n > hi { continue }
    guard let src = CIImage(contentsOf: inDir.appendingPathComponent(name)), let cg = ctx.createCGImage(src, from: src.extent) else { continue }
    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .accurate
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
    guard let pb = req.results?.first?.pixelBuffer else { print("\(name) none"); continue }
    var m = CIImage(cvPixelBuffer: pb)
    m = m.transformed(by: CGAffineTransform(scaleX: src.extent.width / m.extent.width, y: src.extent.height / m.extent.height))
    let W = Int(src.extent.width), H = Int(src.extent.height)
    var px = [UInt8](repeating: 0, count: W * H)
    ctx.render(m, toBitmap: &px, rowBytes: W, bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .L8, colorSpace: nil)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 1,
                               hasAlpha: false, isPlanar: false, colorSpaceName: .deviceWhite, bytesPerRow: W, bitsPerPixel: 8)!
    px.withUnsafeBufferPointer { p in memcpy(rep.bitmapData!, p.baseAddress!, W * H) }
    try? rep.representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name))
    print(name, CVPixelBufferGetWidth(pb), "x", CVPixelBufferGetHeight(pb))
}

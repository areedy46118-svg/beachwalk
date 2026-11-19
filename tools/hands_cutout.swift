// Cuts the HANDS and what they hold out of every frame of a clip, with the
// foreground-instance model that ships with macOS 14+ ("Lift subject").
// Unlike subject_cutout.swift (which keeps every instance) this keeps only the
// instances that reach the BOTTOM of the frame (the arms come in from there)
// plus any instance that overlaps one of them by its bounding box and sits
// below the top band (the paper the hands hold) — the candle, the notebook and
// the rest of a table are dropped.
//
//   swift tools/hands_cutout.swift <indir of .png> <outdir> [--stats]
//
// Out: one RGBA png per frame, same name, same size, the mask in the alpha.

import Foundation
import CoreImage
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: hands_cutout.swift <indir> <outdir> [--stats]\n".data(using: .utf8)!)
    exit(2)
}
let inDir = URL(fileURLWithPath: args[1]), outDir = URL(fileURLWithPath: args[2])
let stats = args.contains("--stats")
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let names = (try FileManager.default.contentsOfDirectory(atPath: inDir.path)).filter { $0.hasSuffix(".png") }.sorted()
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])

for name in names {
    let url = inDir.appendingPathComponent(name)
    guard let src = CIImage(contentsOf: url), let srcCG = ctx.createCGImage(src, from: src.extent) else { continue }
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: srcCG, options: [:])
    try? handler.perform([request])
    guard let obs = request.results?.first else { print("\(name) none"); continue }
    // the label map: one byte per pixel, 0 = background, k = instance k
    let lab = obs.instanceMask
    CVPixelBufferLockBaseAddress(lab, .readOnly)
    let w = CVPixelBufferGetWidth(lab), h = CVPixelBufferGetHeight(lab), rb = CVPixelBufferGetBytesPerRow(lab)
    let base = CVPixelBufferGetBaseAddress(lab)!.assumingMemoryBound(to: UInt8.self)
    var x0 = [Int: Int](), x1 = [Int: Int](), y0 = [Int: Int](), y1 = [Int: Int](), cnt = [Int: Int]()
    for y in 0..<h { for x in 0..<w {
        let k = Int(base[y * rb + x]); if k == 0 { continue }
        cnt[k, default: 0] += 1
        x0[k] = min(x0[k] ?? x, x); x1[k] = max(x1[k] ?? x, x)
        y0[k] = min(y0[k] ?? y, y); y1[k] = max(y1[k] ?? y, y)
    } }
    CVPixelBufferUnlockBaseAddress(lab, .readOnly)
    // y grows DOWN in the label map
    let bottom = Set(cnt.keys.filter { (y1[$0] ?? 0) >= h - max(2, h / 30) })
    var keep = bottom
    for k in cnt.keys where !bottom.contains(k) {
        let cy = Double((y0[k]! + y1[k]!)) / 2 / Double(h)
        let overlaps = bottom.contains { b in x0[k]! < x1[b]! && x1[k]! > x0[b]! && y1[k]! > y0[b]! }
        if overlaps && cy > 0.3 && Double(cnt[k]!) > Double(w * h) * 0.02 { keep.insert(k) }
    }
    if stats {
        let s = cnt.keys.sorted().map { k in "\(k):\(cnt[k]!) [\(x0[k]!)-\(x1[k]!) x \(y0[k]!)-\(y1[k]!)]\(keep.contains(k) ? "*" : "")" }
        print("\(name) \(w)x\(h) " + s.joined(separator: " "))
    }
    let inst = IndexSet(keep.map { $0 })
    guard !inst.isEmpty, let mb = try? obs.generateScaledMaskForImage(forInstances: inst, from: handler) else { print("\(name) empty"); continue }
    let blend = CIFilter(name: "CIBlendWithMask")!
    blend.setValue(CIImage(cgImage: srcCG), forKey: kCIInputImageKey)
    blend.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
    blend.setValue(CIImage(cvPixelBuffer: mb), forKey: kCIInputMaskImageKey)
    guard let cut = blend.outputImage?.cropped(to: src.extent), let cg = ctx.createCGImage(cut, from: src.extent) else { continue }
    let png = NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!
    try? png.write(to: outDir.appendingPathComponent(name))
}

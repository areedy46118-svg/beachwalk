// Two passes over a clip's frames with the foreground-instance model ("Lift subject", macOS 14+), for cutouts where
// WHICH instances to keep is decided per frame elsewhere (tools/intro_cut_pack.py) — the hands, what they hold and
// the sketchbook, not the table they lie on.
//
//   swift tools/scene_cutout.swift labels <indir of .png> <outdir>       one 8-bit label map per frame (0 = none)
//   swift tools/scene_cutout.swift cut <indir> <outdir> <keep.json>       {"001.png": [1, 3], ...} → RGBA png, the
//                                                                         chosen instances' soft mask in the alpha
import Foundation
import CoreImage
import Vision
import AppKit

let a = CommandLine.arguments
let mode = a[1], inDir = URL(fileURLWithPath: a[2]), outDir = URL(fileURLWithPath: a[3])
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let names = (try FileManager.default.contentsOfDirectory(atPath: inDir.path)).filter { $0.hasSuffix(".png") }.sorted()
let ctx = CIContext(options: [.workingColorSpace: CGColorSpace(name: CGColorSpace.sRGB)!])
var keep = [String: [Int]]()
if mode == "cut" { keep = (try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[4])))) as! [String: [Int]] }

for name in names {
    if mode == "cut" && keep[name] == nil { continue }
    let url = inDir.appendingPathComponent(name)
    guard let src = CIImage(contentsOf: url), let srcCG = ctx.createCGImage(src, from: src.extent) else { continue }
    let req = VNGenerateForegroundInstanceMaskRequest()
    let h = VNImageRequestHandler(cgImage: srcCG, options: [:])
    try? h.perform([req])
    guard let obs = req.results?.first else { print("\(name) none"); continue }
    if mode == "labels" {
        let lab = obs.instanceMask
        CVPixelBufferLockBaseAddress(lab, .readOnly)
        let w = CVPixelBufferGetWidth(lab), hh = CVPixelBufferGetHeight(lab), rb = CVPixelBufferGetBytesPerRow(lab)
        let base = CVPixelBufferGetBaseAddress(lab)!.assumingMemoryBound(to: UInt8.self)
        var px = [UInt8](repeating: 0, count: w * hh)
        for y in 0..<hh { for x in 0..<w { px[y * w + x] = base[y * rb + x] } }
        CVPixelBufferUnlockBaseAddress(lab, .readOnly)
        let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: hh, bitsPerSample: 8, samplesPerPixel: 1,
                                   hasAlpha: false, isPlanar: false, colorSpaceName: .deviceWhite, bytesPerRow: w, bitsPerPixel: 8)!
        px.withUnsafeBufferPointer { p in memcpy(rep.bitmapData!, p.baseAddress!, w * hh) }
        try? rep.representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name))
        continue
    }
    let ids = IndexSet(keep[name]!)
    guard !ids.isEmpty, let mb = try? obs.generateScaledMaskForImage(forInstances: ids, from: h) else { print("\(name) empty"); continue }
    let blend = CIFilter(name: "CIBlendWithMask")!
    blend.setValue(CIImage(cgImage: srcCG), forKey: kCIInputImageKey)
    blend.setValue(CIImage.empty(), forKey: kCIInputBackgroundImageKey)
    blend.setValue(CIImage(cvPixelBuffer: mb), forKey: kCIInputMaskImageKey)
    guard let cut = blend.outputImage?.cropped(to: src.extent), let cg = ctx.createCGImage(cut, from: src.extent) else { continue }
    try? NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: outDir.appendingPathComponent(name))
}

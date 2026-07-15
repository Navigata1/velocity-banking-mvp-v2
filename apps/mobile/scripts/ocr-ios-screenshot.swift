import Foundation
import ImageIO
import Vision

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: ocr-ios-screenshot <image-path>\n", stderr)
  exit(2)
}

let imageUrl = URL(fileURLWithPath: CommandLine.arguments[1])
guard
  let source = CGImageSourceCreateWithURL(imageUrl as CFURL, nil),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  fputs("Unable to read screenshot.\n", stderr)
  exit(3)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true

do {
  try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  for observation in request.results ?? [] {
    if let candidate = observation.topCandidates(1).first, candidate.confidence >= 0.8 {
      let box = observation.boundingBox
      let record: [String: Any] = [
        "text": candidate.string,
        "confidence": candidate.confidence,
        "x": box.origin.x,
        "y": box.origin.y,
        "width": box.size.width,
        "height": box.size.height
      ]
      if let data = try? JSONSerialization.data(withJSONObject: record),
         let line = String(data: data, encoding: .utf8) {
        print(line)
      }
    }
  }
} catch {
  fputs("OCR failed: \(error)\n", stderr)
  exit(4)
}

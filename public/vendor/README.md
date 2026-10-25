Third-party files for photo search (`public/photo-scan.js`), served from this site because the shop's
Content Security Policy allows scripts only from the same origin.

- `tf.min.js` — TensorFlow.js 4.22.0 (`@tensorflow/tfjs` on npm, `dist/tf.min.js`). Apache License 2.0.
- `mobilenet/` — MobileNet v2 0.5 224 ImageNet classification model from TensorFlow Hub
  (`google/imagenet/mobilenet_v2_050_224/classification/2`, TF.js format). Apache License 2.0.
  Weights were re-packed as uint8 per tensor (7.8 MB → 2.0 MB); the app reads the `Logits/AvgPool`
  layer (1280 numbers per picture).

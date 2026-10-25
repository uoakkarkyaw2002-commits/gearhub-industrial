Image model for photo search (`lib/photo-search.js`).

- `dinov2-small-q8.onnx` — DINOv2 small (Meta AI, Apache License 2.0), ONNX export with uint8 weights
  from Hugging Face `Xenova/dinov2-small` (`onnx/model_quantized.onnx`). The first output token of
  `last_hidden_state` (384 numbers) is used as the picture's "look".

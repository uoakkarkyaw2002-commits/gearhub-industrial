Image model for photo search (`lib/photo-search.js`).

- `dinov2-small-q8.onnx` — DINOv2 small (Meta AI, Apache License 2.0), ONNX export with uint8 weights
  from Hugging Face `Xenova/dinov2-small` (`onnx/model_quantized.onnx`). The first output token of
  `last_hidden_state` (384 numbers) is used as the picture's "look".

Background removal for product photos (`lib/bg-remove.js`, "Edit photo" in the product form).

- `u2netp.onnx` — U²-Netp (Xuebin Qin et al., Apache License 2.0), 320×320 input, 4.6 MB, taken from the
  npm package `@rmbg/model-u2netp` 0.0.1. The first output (d0, already 0–1) is the object mask.

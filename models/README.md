Image model for photo search (`lib/photo-search.js`).

- `dinov2-small-q8.onnx` — DINOv2 small (Meta AI, Apache License 2.0), ONNX export with uint8 weights
  from Hugging Face `Xenova/dinov2-small` (`onnx/model_quantized.onnx`). The first output token of
  `last_hidden_state` (384 numbers) is used as the picture's "look".

Background removal for product photos (`lib/bg-remove.js`, "Edit photo" in the product form).

- `silueta.onnx` — "silueta" from rembg (U²-Net retrained/distilled for clean cut-outs, MIT), 320×320 input,
  44 MB, from the npm package `@rmbg/model-silueta` 0.0.1 (its five parts joined in order). The first
  output (d0, 0–1) is the object mask. Replaced U²-Netp (1.1.227), which left smudges on product photos.

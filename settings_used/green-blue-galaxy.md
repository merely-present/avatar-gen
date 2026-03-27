# Green - Blue Galaxy

## Single SVG Output

```bash
npm run generate -- --output-dir ./output_images --text $'/^merely\npresent/' --text-size 65 --text-line-height 2 --text-font 'Kode Mono' --text-glow-distance 4 --text-glow-strength 1.0 --text-backing-spread 3 --text-backing-opacity 1 --wave-freq-expr '8 - 6*x' --wave-color-loop-count 1 --wave-amplitude 10 --wave-count 16 --wave-start-degree 130 --wave-distance 120 --wave-lightness 0.45 --wave-chroma 0.15 --wave-effect smear-down --wave-effect-strength 4 --shadow-darkness 1 --dimmer 0.5 --dimmer-blur 0 --flower-dimmer 0 --flower-dimmer-blur 6 --flower-size 0.225 --flower-lightness 0.5 --flower-chroma 0.055 --flower-opacity 1 --flower-layer-blur 1.0 --lobe-count 8 --lobe-bumpiness 0.03 --outer-polygon-edges 16 --outer-polygon-radius 196 --polygon-ring-step 26.25 --polygon-node-radius 1.5 --polygon-node-glow 3 --polygon-node-twinkle 9 --polygon-node-glow-twinkle 5 --polygon-node-twinkle-radius 2 --seed 3209902991
```

## Animated GIF Output

```bash
npm run generate-animated -- --output-dir ./output_images --seeds 3209902991 --fps 30 --time-per-twinkle-ms 300,100,400,200 --twinkle-cycles 7 --res 1200 --name merely_present --text $'/^merely\npresent/' --text-size 65 --text-line-height 2 --text-font 'Kode Mono' --text-glow-distance 4 --text-glow-strength 1.0 --text-backing-spread 3 --text-backing-opacity 1 --wave-freq-expr '8 - 6*x' --wave-color-loop-count 1 --wave-amplitude 10 --wave-count 16 --wave-start-degree 130 --wave-distance 120 --wave-lightness 0.45 --wave-chroma 0.15 --wave-effect smear-down --wave-effect-strength 4 --shadow-darkness 1 --dimmer 0.5 --dimmer-blur 0 --flower-dimmer 0 --flower-dimmer-blur 6 --flower-size 0.225 --flower-lightness 0.5 --flower-chroma 0.055 --flower-opacity 1 --flower-layer-blur 1.0 --lobe-count 8 --lobe-bumpiness 0.03 --outer-polygon-edges 16 --outer-polygon-radius 196 --polygon-ring-step 26.25 --polygon-node-radius 1.5 --polygon-node-glow 3 --polygon-node-twinkle 9 --polygon-node-glow-twinkle 5 --polygon-node-twinkle-radius 2
```

## Font Cycle Output

```bash
npm run generate-cycle-fonts -- --output-dir ./output_images/font_cycle --text $'/^merely\npresent/' --text-size 65 --text-line-height 2 --text-font 'Kode Mono' --text-glow-distance 4 --text-glow-strength 1.0 --text-backing-spread 3 --text-backing-opacity 1 --wave-freq-expr '8 - 6*x' --wave-color-loop-count 1 --wave-amplitude 10 --wave-count 16 --wave-start-degree 130 --wave-distance 120 --wave-lightness 0.45 --wave-chroma 0.15 --wave-effect smear-down --wave-effect-strength 4 --shadow-darkness 1 --dimmer 0.5 --dimmer-blur 0 --flower-dimmer 0 --flower-dimmer-blur 6 --flower-size 0.225 --flower-lightness 0.5 --flower-chroma 0.055 --flower-opacity 1 --flower-layer-blur 1.0 --lobe-count 8 --lobe-bumpiness 0.03 --outer-polygon-edges 16 --outer-polygon-radius 196 --polygon-ring-step 26.25 --polygon-node-radius 1.5 --polygon-node-glow 3 --polygon-node-twinkle 9 --polygon-node-glow-twinkle 5 --polygon-node-twinkle-radius 2 --seed 3209902991
```

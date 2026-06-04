import sys
import cv2
import numpy as np
import argparse
import torch
import colorizers

def enhance_colorized(img):
    """
    Post-processing specifically for AI-colorized B&W images.
    Works in LAB space to boost color richness without affecting detail.
    
    The AI model predicts muted colors — this makes them look natural & rich,
    like a professionally hand-colored photograph.
    
    Pipeline:
      1. LAB color channel amplification (richer, deeper colors)
      2. Gentle CLAHE on lightness (subtle contrast lift)
      3. Selective vibrance
      4. Final sharpening
      5. Background protection
    """
    original = img.copy()

    # ── 1. LAB COLOR AMPLIFICATION ──
    # The AI model predicts conservative/muted AB channels.
    # Amplify them to make colors bolder and more realistic.
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    l_ch = lab[:, :, 0]
    a_ch = lab[:, :, 1]  # green-red axis (128 = neutral)
    b_ch = lab[:, :, 2]  # blue-yellow axis (128 = neutral)
    
    # Amplify color deviation from neutral (128)
    # This makes greens greener, reds redder, blues bluer — naturally
    color_boost = 1.45
    a_ch = np.clip((a_ch - 128) * color_boost + 128, 0, 255)
    b_ch = np.clip((b_ch - 128) * color_boost + 128, 0, 255)
    
    lab[:, :, 1] = a_ch
    lab[:, :, 2] = b_ch
    img = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

    # ── 2. GENTLE CLAHE ON LIGHTNESS ──
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    lab = cv2.merge([l_ch, a_ch, b_ch])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # ── 3. SELECTIVE VIBRANCE ──
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    sat = hsv[:, :, 1] / 255.0
    vibrance = 1.0 + 0.35 * (1.0 - sat)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * vibrance, 0, 255)
    img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    # ── 4. FINAL SHARPENING ──
    blur = cv2.GaussianBlur(img, (0, 0), 1.2)
    img = cv2.addWeighted(img, 1.3, blur, -0.3, 0)

    # ── 5. BACKGROUND PROTECTION ──
    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    mask = gray.astype(np.float32) / 255.0
    mask = np.clip((mask - 0.65) / 0.20, 0, 1)
    mask = cv2.GaussianBlur(mask, (21, 21), 0)
    mask_3ch = np.stack([mask, mask, mask], axis=2)
    img = (img.astype(np.float32) * (1 - mask_3ch) + original.astype(np.float32) * mask_3ch)
    img = np.clip(img, 0, 255).astype(np.uint8)

    return img


def enhance_color_image(img):
    """
    Enhancement for already-color images.
    Boosts existing colors, adds contrast and sharpness.
    """
    original = img.copy()

    # ── 1. CLAHE CONTRAST ──
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    lab = cv2.merge([l_ch, a_ch, b_ch])
    img = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # ── 2. VIBRANCE ──
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    sat = hsv[:, :, 1] / 255.0
    vibrance = 1.0 + 0.65 * (1.0 - sat)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * vibrance, 0, 255)
    img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    # ── 3. SATURATION BOOST ──
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.25, 0, 255)
    img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

    # ── 4. SHARPENING ──
    blur = cv2.GaussianBlur(img, (0, 0), 1.2)
    img = cv2.addWeighted(img, 1.35, blur, -0.35, 0)

    # ── 5. BACKGROUND PROTECTION ──
    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    mask = gray.astype(np.float32) / 255.0
    mask = np.clip((mask - 0.65) / 0.20, 0, 1)
    mask = cv2.GaussianBlur(mask, (21, 21), 0)
    mask_3ch = np.stack([mask, mask, mask], axis=2)
    img = (img.astype(np.float32) * (1 - mask_3ch) + original.astype(np.float32) * mask_3ch)
    img = np.clip(img, 0, 255).astype(np.uint8)

    return img


def upscale_lanczos(img, scale):
    """High-quality Lanczos upscale with clarity pass"""
    h, w = img.shape[:2]
    up = cv2.resize(img, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
    blur = cv2.GaussianBlur(up, (0, 0), 1.0)
    sharp = cv2.addWeighted(up, 1.35, blur, -0.35, 0)
    return sharp


def colorize(input_path, output_path, output_2x_path, output_4x_path, enhance_only=False):
    try:
        if enhance_only:
            print("Color image detected — Enhancing & Upscaling...")
            img_bgr = cv2.imread(input_path)
            if img_bgr is None:
                raise ValueError("Could not read input image")
            print("Applying Color Enhancement...")
            final_img = enhance_color_image(img_bgr)
        else:
            print("Loading PyTorch Semantic AI Model...")
            colorizer = colorizers.siggraph17(pretrained=True).eval()
            print("Loading image...")
            img = colorizers.load_img(input_path)
            print("Running Semantic Inference...")
            tens_l_orig, tens_l_rs = colorizers.preprocess_img(img, HW=(256, 256))
            with torch.no_grad():
                out_img = colorizers.postprocess_tens(tens_l_orig, colorizer(tens_l_rs).cpu())
            img_bgr = cv2.cvtColor(np.ascontiguousarray(out_img), cv2.COLOR_RGB2BGR)
            img_bgr = np.clip(img_bgr * 255, 0, 255).astype(np.uint8)
            print("Applying Professional Colorization Enhancement...")
            final_img = enhance_colorized(img_bgr)

        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_JPEG_QUALITY, 97])

        print("Generating 2x upscale...")
        img_2x = upscale_lanczos(final_img, 2)
        cv2.imwrite(output_2x_path, img_2x, [cv2.IMWRITE_JPEG_QUALITY, 97])

        print("Generating 4x upscale...")
        img_4x = upscale_lanczos(final_img, 4)
        cv2.imwrite(output_4x_path, img_4x, [cv2.IMWRITE_JPEG_QUALITY, 97])

        print("SUCCESS")
    except Exception as e:
        print("ERROR:", str(e))
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--output2x", required=True)
    parser.add_argument("--output4x", required=True)
    parser.add_argument("--enhance-only", action="store_true", help="Skip colorization, only enhance + upscale")
    args = parser.parse_args()
    colorize(args.input, args.output, args.output2x, args.output4x, enhance_only=args.enhance_only)

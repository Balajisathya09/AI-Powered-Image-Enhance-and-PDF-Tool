import cv2
import numpy as np
import torch
import torch.nn.functional as F

def load_img(img_path):
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Could not load image: {img_path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    # Convert to float [0, 1]
    return img_rgb.astype(np.float32) / 255.0

def resize_img(img, HW=(256,256)):
    return cv2.resize(img, (HW[1], HW[0]), interpolation=cv2.INTER_CUBIC)

def preprocess_img(img_rgb_orig, HW=(256,256)):
    img_rgb_rs = resize_img(img_rgb_orig, HW=HW)
    
    img_lab_orig = cv2.cvtColor(img_rgb_orig, cv2.COLOR_RGB2LAB)
    img_lab_rs = cv2.cvtColor(img_rgb_rs, cv2.COLOR_RGB2LAB)

    img_l_orig = img_lab_orig[:,:,0]
    img_l_rs = img_lab_rs[:,:,0]

    tens_orig_l = torch.Tensor(img_l_orig)[None,None,:,:]
    tens_rs_l = torch.Tensor(img_l_rs)[None,None,:,:]

    return (tens_orig_l, tens_rs_l)

def postprocess_tens(tens_orig_l, out_ab, mode='bilinear'):
    HW_orig = tens_orig_l.shape[2:]
    HW = out_ab.shape[2:]

    if(HW_orig[0]!=HW[0] or HW_orig[1]!=HW[1]):
        out_ab_orig = F.interpolate(out_ab, size=HW_orig, mode='bilinear', align_corners=False)
    else:
        out_ab_orig = out_ab

    out_lab_orig = torch.cat((tens_orig_l, out_ab_orig), dim=1)
    
    # lab2rgb
    lab_np = out_lab_orig.data.cpu().numpy()[0,...].transpose((1,2,0))
    # Clip to valid range just in case
    lab_np[:,:,0] = np.clip(lab_np[:,:,0], 0, 100)
    
    rgb = cv2.cvtColor(lab_np, cv2.COLOR_LAB2RGB)
    return np.clip(rgb, 0, 1)

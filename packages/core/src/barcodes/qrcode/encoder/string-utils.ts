// Port of internal/barcodes/qrcode/encoder/string_utils.go
//
// Provides minimal charset constants used by the QR encoder.

export const StringUtils_ASSUME_SHIFT_JIS = false;
export const StringUtils_SHIFT_JIS = "SJIS";
export const StringUtils_GB2312 = "GB2312";

// We expose canonical encoding names; encoding to bytes happens via
// encodeBytes() in character-set-eci.ts which knows how to handle each.
export const StringUtils_PLATFORM_DEFAULT_ENCODING = "UTF-8";
export const StringUtils_SHIFT_JIS_CHARSET = "Shift_JIS";
export const StringUtils_GB2312_CHARSET = "GB18030";
export const StringUtils_EUC_JP = "EUC-JP";

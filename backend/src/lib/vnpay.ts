import crypto from "crypto";

export function createPaymentUrl({
  amount,
  orderInfo,
  txnRef,
}: {
  amount: number;
  orderInfo: string;
  txnRef: string;
}) {
  const tmnCode = process.env.VNPAY_TMN_CODE!;
  const secretKey = process.env.VNPAY_HASH_SECRET!;
  const vnpUrl = process.env.VNPAY_URL!;
  const returnUrl = process.env.VNPAY_RETURN_URL!;

  const now = new Date();

  const createDate =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const params: Record<string, string> = {
    vnp_Amount: String(amount * 100),
    vnp_Command: "pay",
    vnp_CreateDate: createDate,
    vnp_CurrCode: "VND",
    vnp_IpAddr: "127.0.0.1",
    vnp_Locale: "vn",
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_ReturnUrl: returnUrl,
    vnp_TmnCode: tmnCode,
    vnp_TxnRef: txnRef,
    vnp_Version: "2.1.0",
  };

  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  const signData = new URLSearchParams(sortedParams).toString();

  const secureHash = crypto
    .createHmac("sha512", secretKey)
    .update(signData, "utf8")
    .digest("hex");

  return `${vnpUrl}?${signData}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${secureHash}`;
}
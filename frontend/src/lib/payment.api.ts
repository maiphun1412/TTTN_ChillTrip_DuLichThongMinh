// src/lib/payment.api.ts

export async function createVnpayPayment(paymentId: number) {
  const res = await fetch("/backend-api/payments/vnpay/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentId }),
  });

  if (!res.ok) {
    throw new Error("Không tạo được link thanh toán VNPay");
  }

  return res.json() as Promise<{ paymentUrl: string }>;
}
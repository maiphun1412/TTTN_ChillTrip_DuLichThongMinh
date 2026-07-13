"use client";

export type GroupContractFormData = {
  contractCode: string;
  createdDate: string;
  organizationName: string;
  representativeName: string;
  representativePhone: string;
  representativeEmail: string;
  tourName: string;
  startDate: string;
  guestCount: string;
  contractValue: string;
  depositAmount: string;
  paymentTerms: string;
  cancellationTerms: string;
  note: string;
};

type Props = {
  value: GroupContractFormData;
  onChange: (value: GroupContractFormData) => void;
};

export default function GroupContractForm({ value, onChange }: Props) {
  function setField(key: keyof GroupContractFormData, fieldValue: string) {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input label="Số hợp đồng" value={value.contractCode} onChange={(v) => setField("contractCode", v)} />
      <Input label="Ngày lập" value={value.createdDate} onChange={(v) => setField("createdDate", v)} />
      <Input label="Tên công ty / tổ chức" value={value.organizationName} onChange={(v) => setField("organizationName", v)} />
      <Input label="Người đại diện" value={value.representativeName} onChange={(v) => setField("representativeName", v)} />
      <Input label="Số điện thoại" value={value.representativePhone} onChange={(v) => setField("representativePhone", v)} />
      <Input label="Email" value={value.representativeEmail} onChange={(v) => setField("representativeEmail", v)} />
      <Input label="Tên tour" value={value.tourName} onChange={(v) => setField("tourName", v)} />
      <Input label="Ngày khởi hành" value={value.startDate} onChange={(v) => setField("startDate", v)} />
      <Input label="Số khách" value={value.guestCount} onChange={(v) => setField("guestCount", v)} />
      <Input label="Giá trị hợp đồng" value={value.contractValue} onChange={(v) => setField("contractValue", v)} />
      <Input label="Tiền cọc" value={value.depositAmount} onChange={(v) => setField("depositAmount", v)} />

      <Textarea label="Điều khoản thanh toán" value={value.paymentTerms} onChange={(v) => setField("paymentTerms", v)} />
      <Textarea label="Điều khoản hoàn hủy" value={value.cancellationTerms} onChange={(v) => setField("cancellationTerms", v)} />
      <Textarea label="Ghi chú" value={value.note} onChange={(v) => setField("note", v)} />
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007B8A]"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 md:col-span-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#007B8A]"
      />
    </label>
  );
}

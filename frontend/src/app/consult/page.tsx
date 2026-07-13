import HomeHeader from "../../components/home/HomeHeader";
import { HomeFooter } from "../../components/home/HomeSections";



export default function ConsultPage() {
  return (
    <main className="bg-[#f6fafb] text-[#181c1d]">
      <HomeHeader />

      <div className="pt-20">
        <section className="relative flex h-[614px] items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJN1Y1Dg6VWpfj-DXm8gdsoFw50d68Q5c46H8V7glTz1zDPSWuFm3agaqYAlZVIcen8-U_Vsy6h6Y80AEfTYCA3jsw3pDSPd3sQZ35aGsUFFPACGbm0KuV2dF-EW06hUZg0PtrqArgFBh-lxcP8hUbSGF7T8q_xGqtRQSOI9aE6uXG06q6ePNRlg8BI7JT_vXjrtm312gq0otuz6jBaQgKWsIKUU2lG_LGIiSTT9nZk_Ly0RPv7RRi9oOLATjwmL0nHcjTZVQ53T1_"
              alt="Hero tư vấn"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-[#00606c]/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#f6fafb]" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-8">
            <div className="max-w-2xl">
              <div className="text-center">
  <span className="mb-4 inline-block rounded-full bg-[#9defff] px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#001f24]">
    Personalized Travel
  </span>
</div>

<h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-[#00606c] md:text-6xl">
  <span className="whitespace-nowrap">
    Nhận tư vấn cá nhân hóa cho
  </span>
  <br />
  chuyến đi mơ ước
</h1>
              <p className="text-lg leading-relaxed text-[#3e494b]">
                Mỗi hành trình là một câu chuyện riêng. Hãy để các chuyên gia của
                ChillTrip cùng bạn kiến tạo những kỷ niệm khó quên nhất.
              </p>
            </div>
          </div>
        </section>

        <section className="relative z-20 mx-auto -mt-20 max-w-7xl px-8 pb-20">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
            <div className="rounded-[28px] border border-[#bdc8cb]/10 bg-white p-8 shadow-[0_16px_32px_rgba(0,96,108,0.08)] md:p-12 lg:col-span-7">
              <h2 className="mb-8 text-3xl font-bold text-[#00606c]">
                Bắt đầu hành trình của bạn
              </h2>

              <form className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Họ tên">
                    <input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-full border-none bg-[#e5e9ea] px-6 py-4 placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]"
                    />
                  </Field>

                  <Field label="Số điện thoại">
                    <input
                      type="tel"
                      placeholder="0901 234 567"
                      className="w-full rounded-full border-none bg-[#e5e9ea] px-6 py-4 placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]"
                    />
                  </Field>
                </div>

                <Field label="Email">
                  <input
                    type="email"
                    placeholder="email@chilltrip.com"
                    className="w-full rounded-full border-none bg-[#e5e9ea] px-6 py-4 placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Điểm đến quan tâm">
                    <select className="w-full rounded-full border-none bg-[#e5e9ea] px-6 py-4 text-[#3e494b] focus:ring-2 focus:ring-[#00606c]">
                      <option>Phú Quốc, Việt Nam</option>
                      <option>Bali, Indonesia</option>
                      <option>Maldives</option>
                      <option>Santorini, Hy Lạp</option>
                    </select>
                  </Field>

                  <Field label="Ngân sách dự kiến">
                    <select className="w-full rounded-full border-none bg-[#e5e9ea] px-6 py-4 text-[#3e494b] focus:ring-2 focus:ring-[#00606c]">
                      <option>Dưới 10 triệu</option>
                      <option>10 - 30 triệu</option>
                      <option>30 - 50 triệu</option>
                      <option>Trên 50 triệu</option>
                    </select>
                  </Field>
                </div>

                <Field label="Ghi chú thêm">
                  <textarea
                    rows={4}
                    placeholder="Hãy kể cho chúng tôi về kỳ nghỉ trong mơ của bạn..."
                    className="w-full rounded-[24px] border-none bg-[#e5e9ea] px-6 py-4 placeholder:text-[#6e797b] focus:ring-2 focus:ring-[#00606c]"
                  />
                </Field>

                <button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-[#9b4500] to-[#fc8a40] py-5 text-lg font-extrabold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Gửi yêu cầu tư vấn
                </button>
              </form>
            </div>

            <div className="space-y-8 lg:col-span-5">
              <div className="rounded-[28px] border border-[#007b8a]/10 bg-[#007b8a]/10 p-8">
                <h3 className="mb-6 text-2xl font-bold text-[#00606c]">
                  Cam kết của ChillTrip
                </h3>

                <div className="space-y-6">
                  <CommitmentItem
                    icon="⏱"
                    title="Tư vấn nhanh trong 24h"
                    desc="Đội ngũ chuyên gia sẽ liên hệ với bạn trong vòng một ngày làm việc."
                  />
                  <CommitmentItem
                    icon="❤"
                    title="Hoàn toàn miễn phí"
                    desc="Chúng tôi tư vấn vì niềm đam mê xê dịch, không thu bất kỳ phí dịch vụ nào."
                  />
                  <CommitmentItem
                    icon="🔒"
                    title="Bảo mật thông tin"
                    desc="Mọi dữ liệu cá nhân của bạn được bảo mật tuyệt đối theo tiêu chuẩn quốc tế."
                  />
                </div>
              </div>

              <div className="group relative aspect-[4/3] overflow-hidden rounded-[28px]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAP30b0ew-Yqgb8hEKE-imPu6uVk_JBRdh5Clc_0DcdCeXWt4IUudU2Oe902ltAX7pPgctLHR5v3WyIoUA_UuCgQW4fXehus8Y1CfipAPqk6pUJxsp5K5kciml6BXId_5vF_HyzEHHxraKpBC7dHUxo8cPqpsIn7Rs7Sg7V_maH2L9ZpuMl4CH5kSOGBrwPosSLr3kH4tg1hmgIBQ4IaVfqk_QD-yq9JXZnyBvvY6YvMPSiIpkj1L6SWpqfoTMI7DiVBJlKcgDmvnKP"
                  alt="Khách hàng thân thiết"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-[#00606c]/80 to-transparent p-8">
                  <p className="text-lg italic leading-relaxed text-white">
                    "Nhờ ChillTrip, chuyến đi trăng mật của chúng tôi tại
                    Santorini đã trở nên hoàn hảo hơn bao giờ hết."
                  </p>
                  <span className="mt-2 font-bold text-[#9defff]">
                    — Lan Anh, Khách hàng thân thiết
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        
      </div>

      <HomeFooter />
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="px-1 text-xs font-bold uppercase tracking-widest text-[#3e494b]">
        {label}
      </label>
      {children}
    </div>
  );
}

function CommitmentItem({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00606c] text-white">
        <span>{icon}</span>
      </div>
      <div>
        <h4 className="font-bold text-[#00606c]">{title}</h4>
        <p className="text-sm text-[#3e494b]">{desc}</p>
      </div>
    </div>
  );
}
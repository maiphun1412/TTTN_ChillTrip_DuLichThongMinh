import SiteLayout from "../../components/layout/SiteLayout";
import Link from "next/link";

export default function AboutPage() {
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative flex h-screen w-full items-center justify-center overflow-hidden">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCaw6WEsgx1VKzFM1lnJlwCU3JPyMhwE7qoj4DTFkzEBJixIQ9oaXrKz2qF5dROVuTp4YLU2lW5P1LqHBscfUgUdbNlYU2TgyEvK7X-FDVe1c6gxvwlfHKbP1AHXpyc_z3quVVmKVV9VJLeMHTw0zWOJUyZ8rB33y2Av7GE8uduCSPEo2tQPsX1KtbsDBW-eJDM0EzT8Tzt2DYsgVF2GmwCq7ipwQPovJR6yzX7YHWncmRKWMhH5HZCAjU5tTp4D_j1SWZLLa5rRZ3R"
          alt="Hero ChillTrip"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/65" />

        <div className="relative z-10 max-w-5xl px-6 text-center">
          <span className="mb-6 inline-block rounded-full border border-white/30 bg-[#00606c]/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-white backdrop-blur-md">
            Thế giới trong tầm mắt bạn
          </span>

          <h1 className="mb-8 text-6xl font-black leading-[0.9] tracking-[-0.04em] text-white drop-shadow-2xl md:text-8xl">
            Định nghĩa lại
            <br />
            Sự Tự Do
          </h1>

          <p className="mx-auto max-w-2xl text-xl font-medium leading-relaxed text-white/90 md:text-2xl">
            Chúng tôi không tạo ra những tour du lịch. Chúng tôi kiến tạo những
            chương mới rực rỡ trong cuốn nhật ký cuộc đời bạn.
          </p>

          <div className="mt-12 flex justify-center">
            <span className="animate-bounce text-4xl text-white">⌄</span>
          </div>
        </div>
      </section>

      {/* Ethos */}
      <section className="bg-white py-32">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#00606c]">
            Triết lý ChillTrip
          </h2>

          <h3 className="mb-10 text-4xl font-bold leading-tight text-[#181c1d] md:text-5xl">
            Du lịch không chỉ là đi, mà là tìm thấy chính mình
          </h3>

          <div className="space-y-6 text-lg leading-relaxed text-[#3e494b]">
            <p>
              Tại ChillTrip, chúng tôi tin rằng mỗi hành trình là một cơ hội để
              tái định nghĩa bản thân. Bắt đầu từ năm 2018 với một nhóm nhỏ
              những người yêu xê dịch, chúng tôi đã không ngừng tìm kiếm những
              giá trị đích thực đằng sau mỗi tấm vé máy bay hay mỗi phòng khách
              sạn.
            </p>

            <p>
              ChillTrip được xây dựng dựa trên sự cân bằng hoàn hảo giữa{" "}
              <strong>sự tiện nghi cao cấp</strong> và{" "}
              <strong>trải nghiệm bản địa chân thực</strong>. Chúng tôi tin rằng
              bạn xứng đáng được chăm sóc tận tình nhất trong khi vẫn có thể
              chạm tay vào linh hồn của những vùng đất mới lạ.
            </p>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-[#f1f4f5] py-24">
        <div className="mx-auto max-w-7xl px-8">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-black text-[#00606c]">
              Tại sao chọn ChillTrip?
            </h2>
            <p className="mx-auto max-w-xl text-[#3e494b]">
              Sự khác biệt nằm ở tâm huyết và công nghệ hiện đại.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <WhyCard
              iconWrapClass="bg-[#9defff]"
              icon="🧠"
              title="Cá nhân hóa AI"
              desc="Hệ thống AI thông minh phân tích sở thích để thiết kế lịch trình riêng biệt, đảm bảo không có hai chuyến đi nào giống nhau."
            />
            <WhyCard
              iconWrapClass="bg-[#ffdbc9]"
              icon="🛡️"
              title="Bảo hiểm Toàn diện"
              desc="Chúng tôi cung cấp các gói bảo hiểm du lịch cao cấp nhất, bảo vệ bạn và gia đình trước mọi tình huống bất ngờ 24/7."
            />
            <WhyCard
              iconWrapClass="bg-[#b3ebff]"
              icon="👜"
              title="Độc quyền Bản địa"
              desc="Mạng lưới đối tác chiến lược cho phép khách hàng ChillTrip tiếp cận những trải nghiệm không bao giờ xuất hiện trên Google."
            />
          </div>
        </div>
      </section>

      {/* Cultural values */}
      <section className="bg-[#00606c] py-32 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-8">
          <h2 className="mb-12 text-center text-sm font-black uppercase tracking-[0.4em] opacity-80">
            Giá trị Văn hóa
          </h2>

          <div className="grid w-full grid-cols-1 items-center gap-20 lg:grid-cols-2">
            <div className="space-y-12">
              <ValueRow
                number="01"
                title="Tôn trọng Bản sắc"
                desc="Chúng tôi luôn làm việc chặt chẽ với cộng đồng địa phương để bảo tồn và tôn vinh những nét văn hóa nguyên bản nhất."
              />
              <ValueRow
                number="02"
                title="Trách nhiệm Xanh"
                desc="Mỗi hành trình đều được tối ưu hóa để giảm thiểu tác động đến môi trường, thúc đẩy du lịch bền vững và tái tạo."
              />
              <ValueRow
                number="03"
                title="Đổi mới Không ngừng"
                desc="Văn hóa của chúng tôi là văn hóa học hỏi. Chúng tôi không sợ thử nghiệm những cách thức mới để mang lại niềm vui."
              />
            </div>

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl transition-all hover:bg-white/20" />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUWL6hwEvfw3oYeFKj50V8JO9Ja7jX8kM9_vXu4YANYq9JaqS-GNJoNnCLUQQhTVVaVEhSESf9QaajS2r1iErxg3FR4DkfWu1ihrcqbtTUE-Jb-YCEIPhiGP6t0uIApT-u_NWz-PkV_Nx7H1i3tjvCJhAcR0W12EF90fhJLNHKEQ_l7IeUoRfeaWofxUI9AHw3McLrztFzgUxlch9y_RI1yipC0VtymGenmpcOnUUkdOL6R2HGsbVRgCFZ2dRqypSCXBl4cyOdUMRY"
                alt="Giá trị văn hóa"
                className="relative aspect-video w-full rounded-3xl object-cover shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="relative overflow-hidden bg-white py-32">
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_20%_150%,rgba(0,123,138,0.22)_0%,transparent_50%),radial-gradient(circle_at_80%_-50%,rgba(252,138,64,0.18)_0%,transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-8">
          <div className="mb-20 text-center">
            <span className="mb-4 block text-sm font-black uppercase tracking-[0.3em] text-[#00606c]">
              Lời hứa từ tâm
            </span>

            <h2 className="mb-6 text-4xl font-black tracking-[-0.04em] text-[#181c1d] md:text-6xl">
              Cam kết & Trải nghiệm Đẳng cấp
            </h2>

            <div className="mx-auto h-1.5 w-24 rounded-full bg-[#00606c]" />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <CommitmentCard
              rotateClass="rotate-3"
              iconWrapClass="bg-[#9defff]"
              icon="👤"
              title="Dịch vụ Cá nhân hóa"
              desc="Thiết kế hành trình dựa trên tâm hồn và sở thích riêng biệt của từng lữ khách."
            />
            <CommitmentCard
              rotateClass="-rotate-3"
              iconWrapClass="bg-[#007b8a]/15"
              icon="🛡️"
              title="An toàn Tuyệt đối"
              desc="Hệ thống hỗ trợ 24/7 và tiêu chuẩn an toàn khắt khe nhất trong mọi hành trình."
            />
            <CommitmentCard
              rotateClass="rotate-6"
              iconWrapClass="bg-[#ffdbc9]"
              icon="🧭"
              title="Hướng dẫn viên Bản địa"
              desc="Những người kể chuyện am hiểu, đưa bạn chạm đến linh hồn thật sự của vùng đất."
            />
            <CommitmentCard
              rotateClass="-rotate-6"
              iconWrapClass="bg-[#b3ebff]"
              icon="💎"
              title="Giá trị Thực"
              desc="Minh bạch trong mọi chi phí và cam kết chất lượng dịch vụ xứng tầm đầu tư của bạn."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-32">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[4rem] bg-[#007b8a] p-16 text-center text-white shadow-2xl">
          <div className="absolute -right-48 -top-48 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#9b4500]/25 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="mb-8 text-4xl font-black leading-tight md:text-6xl">
              Mọi hành trình vĩ đại đều bắt đầu từ một lựa chọn.
            </h2>

            <p className="mb-12 text-xl text-[#ddf9ff]">
              Hãy để đội ngũ chuyên gia của chúng tôi giúp bạn lập kế hoạch cho
              chuyến đi đáng nhớ nhất cuộc đời ngay bây giờ.
            </p>

            <div className="flex flex-col justify-center gap-6 sm:flex-row">
             <Link
  href="/tours"
  className="inline-block rounded-full bg-[#9b4500] px-12 py-5 text-xl font-black text-white shadow-xl transition-all hover:scale-105 active:scale-95"
>
  Bắt đầu hành trình
</Link>

              <Link
  href="/consult"
  className="rounded-full border-2 border-white/20 bg-white/10 px-12 py-5 text-xl font-black text-white backdrop-blur-md transition-all hover:bg-white/20"
>
  Tư vấn miễn phí
</Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function WhyCard({
  iconWrapClass,
  icon,
  title,
  desc,
}: {
  iconWrapClass: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-[#bdc8cb]/10 bg-white p-10 text-center shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,96,108,0.12)]">
      <div
        className={`mb-8 flex h-16 w-16 items-center justify-center rounded-full shadow-inner ${iconWrapClass}`}
      >
        <span className="text-3xl">{icon}</span>
      </div>
      <h4 className="mb-4 text-2xl font-bold text-[#00606c]">{title}</h4>
      <p className="max-w-[280px] leading-relaxed text-[#3e494b]">{desc}</p>
    </div>
  );
}

function ValueRow({
  number,
  title,
  desc,
}: {
  number: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-6">
      <div className="text-5xl font-black text-white/30">{number}</div>
      <div>
        <h4 className="mb-2 text-2xl font-bold">{title}</h4>
        <p className="leading-relaxed text-white/70">{desc}</p>
      </div>
    </div>
  );
}

function CommitmentCard({
  rotateClass,
  iconWrapClass,
  icon,
  title,
  desc,
}: {
  rotateClass: string;
  iconWrapClass: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-[#00606c]/10 bg-white/70 p-8 text-center backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,96,108,0.12)]">
      <div
        className={`mb-8 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg ${rotateClass} ${iconWrapClass}`}
      >
        <span className="text-4xl">{icon}</span>
      </div>
      <h4 className="mb-4 text-xl font-bold text-[#00606c]">{title}</h4>
      <p className="text-sm leading-relaxed text-[#3e494b]">{desc}</p>
    </div>
  );
}
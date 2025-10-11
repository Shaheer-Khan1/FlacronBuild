interface IntroDesignProps {
  onGetStarted: () => void;
}

export default function IntroDesign({ onGetStarted }: IntroDesignProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">

      {/* HERO SECTION */}
      <section
        className="relative w-full min-h-[90vh] flex items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80')",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Optional low-opacity subtle overlay image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1920&q=60"
            alt="roof texture background"
            className="w-full h-full object-cover opacity-20"
          />
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">AI-Powered Roofing Estimates</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold leading-tight">
            FLACRON{" "}
            <span className="text-orange-400 bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              BUILD
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
            Professional roofing cost estimation with AI-powered precision. 
            Get detailed reports for homeowners, contractors, inspectors, and insurance adjusters — in minutes.
          </p>

          <div className="flex justify-center">
          <button
  onClick={onGetStarted}
  className="group relative bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-10 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
>
  <span className="relative z-10 inline-block animate-[softPulse_2s_ease-in-out_2.5s_infinite]">
    Get Your Estimate
  </span>

  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>

  <style>
    {`
      @keyframes softPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.95; }
      }
    `}
  </style>
</button>

          </div>

          <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span>Quick Setup</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <span>Secure & Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE SECTION */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Choose{" "}
            <span className="text-orange-500 bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
             <span className="text-black"> FLACRON</span>BUILD
            </span>
            ?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Advanced technology meets professional expertise for accurate roofing solutions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {[
            {
              title: "AI-Powered Accuracy",
              desc: "Machine learning analyzes property data and market trends for precise, real-time estimates.",
            },
            {
              title: "Instant Professional Reports",
              desc: "Generate detailed reports in minutes — clean, formatted, and ready for clients.",
            },
            {
              title: "Trusted by Professionals",
              desc: "Homeowners, contractors, inspectors, and adjusters rely on FLACRON BUILD daily.",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="group p-8 rounded-2xl border border-gray-100 hover:border-orange-200 bg-orange-100 hover:bg-gradient-to-br from-white to-orange-50 transition-all duration-500 hover:shadow-xl transform hover:-translate-y-2"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-gray-900">{card.title}</h3>
              <p className="text-gray-600 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white px-4">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Get your professional roofing estimate in four simple steps.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-10 relative">
          <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-orange-200 to-amber-200 transform -translate-y-1/2"></div>
          {[
            { step: "1", title: "Enter Property Details", desc: "Provide your basic property and roofing info." },
            { step: "2", title: "AI Analysis", desc: "Our AI processes your data instantly." },
            { step: "3", title: "Get Estimate", desc: "Receive a complete cost breakdown in minutes." },
            { step: "4", title: "Download Report", desc: "Access a professional, ready-to-share assessment." },
          ].map((s, i) => (
            <div key={i} className="text-center relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 font-bold text-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                {s.step}
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900">{s.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
{/* CTA Section */}
<section className="relative py-24 px-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white overflow-hidden rounded-t-[3rem] shadow-2xl">
  <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>

  <div className="relative max-w-5xl mx-auto text-center space-y-8">
    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg">
      Ready to Get Your Professional Estimate?
    </h2>
    <p className="text-lg md:text-xl text-orange-100">
      Join <span className="font-semibold text-white">50,000+</span> professionals and homeowners who trust{" "}
      <span className="font-semibold">FLACRON BUILD</span>.
    </p>
<div className="flex justify-center relative z-20">
  <button
    onClick={onGetStarted}
    className="relative z-20 bg-white text-orange-600 hover:text-orange-700 font-bold py-5 px-16 rounded-2xl text-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
  >
    <span className="inline-block animate-[gentleBuzz_1.5s_ease-in-out_2.5s_infinite]">
      Get Started Now
    </span>
    <style>
      {`
        @keyframes gentleBuzz {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translateX(-1px) translateY(-1px); }
          50% { transform: translateX(1px) translateY(1px); }
          75% { transform: translateX(-1px) translateY(1px); }
        }
      `}
    </style>
  </button>
</div>

    <p className="text-sm text-orange-50 pt-6">
      • 30-second setup • Professional-grade reports • Instant AI Estimates
    </p>
  </div>

  {/* Decorative Blur Glow */}
  <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-[500px] h-[500px] bg-white/10 blur-3xl rounded-full"></div>
</section>




    </div>
  );
}

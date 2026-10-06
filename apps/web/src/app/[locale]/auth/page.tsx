'use client';

import { useState } from 'react';
import { Cairo } from 'next/font/google';

const cairo = Cairo({ subsets: ['arabic'], weight: ['400', '700', '800'] });

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => setIsLogin(!isLogin);

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/facebook`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Implementation for local login/register will go here
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 bg-[#f5f5ff] ${cairo.className}`}
      dir="rtl"
    >
      <div className="w-full max-w-md relative z-10">
        <div className="glass bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
              {isLogin ? 'أهلاً بك مجدداً 👋' : 'إنشاء حساب جديد ✨'}
            </h1>
            <p className="text-gray-500 font-bold">
              {isLogin ? 'سجل دخولك للمتابعة' : 'انضم إلينا اليوم'}
            </p>
          </div>

          <form id="authForm" className="space-y-6" onSubmit={handleSubmit}>
            {/* Name Input (Register Only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">الاسم الكامل</label>
                <input
                  type="text"
                  placeholder="محمد أحمد"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none font-bold text-gray-700"
                />
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
              <input
                type="email"
                placeholder="name@example.com"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none font-bold text-gray-700 text-left"
                dir="ltr"
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">كلمة المرور</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none font-bold text-gray-700 text-left"
                dir="ltr"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-lg hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 font-bold text-sm">أو باستخدام</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-4">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="py-3 rounded-2xl border border-gray-200 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition text-gray-700"
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" alt="Google" className="w-5 h-5" />
                جوجل
              </button>
              {/* Facebook Button */}
              <button
                type="button"
                onClick={handleFacebookLogin}
                className="py-3 rounded-2xl border border-gray-200 font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition text-gray-700"
              >
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg" alt="Facebook" className="w-5 h-5" />
                فيسبوك
              </button>
            </div>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 font-bold">
              {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
              <button onClick={toggleMode} className="text-indigo-600 hover:text-indigo-800 transition-colors">
                {isLogin ? 'سجل الآن' : 'تسجيل الدخول'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

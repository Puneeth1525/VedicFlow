import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Vedic Chanting Coach
          </h1>
          <p className="text-purple-300">Welcome back! Enter your email</p>
          <p className="text-purple-400 text-sm mt-2">We'll send you a magic link to sign in</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white/10 backdrop-blur-lg border border-white/20",
              formButtonPrimary: "bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500",
              footerActionLink: "text-purple-400 hover:text-purple-300"
            }
          }}
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  )
}

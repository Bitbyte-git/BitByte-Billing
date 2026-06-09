import { ArrowRight, BadgeCheck, BriefcaseBusiness, GraduationCap, Lightbulb, Mail, Users } from 'lucide-react';
import BrandLogo from '../components/BrandLogo.jsx';
import { COMPANY_NAME } from '../config/brand.js';

const googleFormUrl = import.meta.env.VITE_INTERN_GOOGLE_FORM_URL || '';

const benefits = [
  {
    title: 'Live project exposure',
    text: 'Work around real business workflows, client requirements, billing, dashboards, and digital solutions.',
    icon: BriefcaseBusiness
  },
  {
    title: 'Practical mentoring',
    text: 'Learn from team members who can guide your technical thinking, communication, and delivery habits.',
    icon: Users
  },
  {
    title: 'Career-ready skills',
    text: 'Build confidence with tools, documentation, task ownership, review cycles, and workplace discipline.',
    icon: Lightbulb
  },
  {
    title: 'Completion support',
    text: 'Eligible interns receive internship documentation after successful completion of assigned work.',
    icon: BadgeCheck
  }
];

export default function PublicInternship() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(116,68,220,0.10),transparent_42%),linear-gradient(180deg,#ffffff,#f1f4f9)]" />
        <div className="relative mx-auto grid min-h-[82vh] max-w-7xl gap-10 px-5 py-6 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <BrandLogo size="lg" theme="light" tagline={COMPANY_NAME} />
            <p className="mt-12 text-sm font-black uppercase tracking-[0.28em] text-purple">Internship Program</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              Start building real workplace experience with Bit Byte Technologies.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 md:text-lg">
              Join a team focused on software, automation, digital services, billing workflows, and practical business technology. This internship is designed for students who want hands-on exposure and professional growth.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={googleFormUrl || '#'}
                target={googleFormUrl ? '_blank' : undefined}
                rel={googleFormUrl ? 'noreferrer' : undefined}
                aria-disabled={!googleFormUrl}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black shadow-lg transition ${
                  googleFormUrl
                    ? 'bg-purple text-white shadow-purple/20 hover:bg-[#5f35c8]'
                    : 'cursor-not-allowed bg-slate-300 text-slate-500 shadow-none'
                }`}
              >
                Apply through Google Form <ArrowRight size={18} />
              </a>
              <a
                href="mailto:info@bitbytetech.com"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <Mail size={17} /> Contact team
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-5 py-4">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="p-6 text-white md:p-8">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-xl bg-purple text-white">
                    <GraduationCap size={28} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-white/50">Intern Track</p>
                    <h2 className="text-2xl font-black">Learn. Build. Deliver.</h2>
                  </div>
                </div>
                <div className="mt-8 grid gap-3">
                  {['Real tasks', 'Mentor feedback', 'Team communication', 'Project discipline'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm font-bold">{item}</span>
                      <BadgeCheck className="text-emerald-300" size={18} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-purple">Why Join</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Benefits for interns</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ title, text, icon: Icon }) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple/10 text-purple">
                <Icon size={21} />
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

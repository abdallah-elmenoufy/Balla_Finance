export interface MotivationalQuote {
  text: string;
  source?: string;
  theme: "faith" | "grit" | "freedom" | "encouragement";
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  {
    text: "«مَن أَخَذَ أَمْوَالَ النَّاسِ يُرِيدُ أَدَاءَهَا أَدَّى اللَّهُ عَنْهُ»",
    source: "حديث نبوي شريف — صحيح البخاري",
    theme: "faith",
  },
  {
    text: "«إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا»",
    source: "سورة النساء",
    theme: "faith",
  },
  {
    text: "كل جنيه تسدده اليوم هو حجر ثقيل يُرفع عن كاهلك وخطوة حقيقية لاستعادة راحة بالك وثقة أهلك.",
    theme: "encouragement",
  },
  {
    text: "خسارة التداول كانت درساً وتجربة، لكن وفاءك بعهدك وسداد أمانتك هو الذي يصنع معدنك وقيمتك الحقيقية.",
    theme: "grit",
  },
  {
    text: "«وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ»",
    source: "سورة الطلاق",
    theme: "faith",
  },
  {
    text: "المال يذهب ويأتي، لكن راحة الضمير وعزة النفس وبركة الرزق لا تُقدّر بثمن.",
    theme: "freedom",
  },
  {
    text: "خطوة بخطوة.. كل مبلغ تدفعه مهما كان بسيطاً يقرّبك من يوم الحرية المالية الكاملة.",
    theme: "encouragement",
  },
  {
    text: "ما نقص مالٌ من سداد أمانة، بل يبارك الله لك فيما تبقى ويفتح لك أبواب الخير والرزق الحلال.",
    theme: "faith",
  },
  {
    text: "أنت لا تسدد مجرد أرقام؛ أنت تشتري حريتك، راحتك النفسية، ونومك الهادئ كل ليلة.",
    theme: "freedom",
  },
  {
    text: "تذكر دائماً: العبرة ليست بالسقوط، بل بالوقوف على قدميك والوفاء بكل ما عليك برأس مرفوعة.",
    theme: "grit",
  },
  {
    text: "لا تستصغر أي دفعة تسددها.. السيل يبدأ بقطرة، والديون تنتهي بقرار واستمرار وصبر.",
    theme: "encouragement",
  },
  {
    text: "«أَفْضَلُ الْكَسْبِ كَسْبُ الرَّجُلِ بِيَدِهِ، وَكُلُّ بَيْعٍ مَبْرُورٍ»",
    source: "حديث شريف",
    theme: "faith",
  },
  {
    text: "أنت اليوم أقرب للحرية المالية من أي يوم مضى.. استمر بنفس العزيمة والإصرار!",
    theme: "encouragement",
  },
];

export function getDailyQuote(): MotivationalQuote {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

export interface MilestoneInfo {
  levelTitle: string;
  levelBadge: string;
  nextMilestonePercent: number;
  remainingToNextMilestone: number;
  message: string;
}

export function calculateMilestones(
  totalOriginal: number,
  totalRepaid: number,
  currency = "EGP"
): MilestoneInfo {
  if (totalOriginal <= 0) {
    return {
      levelTitle: "حر طليق بلا ديون",
      levelBadge: "👑",
      nextMilestonePercent: 100,
      remainingToNextMilestone: 0,
      message: "الحمد لله! حساباتك نقية وخالية من الديون.",
    };
  }

  const progress = Math.min(100, Math.round((totalRepaid / totalOriginal) * 100));

  let levelTitle = "خطوة البداية والعزيمة";
  let levelBadge = "🌱";
  let nextMilestone = 25;

  if (progress >= 100) {
    levelTitle = "بطل الوفاء بالأمانة — حر تماماً";
    levelBadge = "👑";
    nextMilestone = 100;
  } else if (progress >= 75) {
    levelTitle = "على مشارف التحرر التام";
    levelBadge = "🌟";
    nextMilestone = 100;
  } else if (progress >= 50) {
    levelTitle = "نصف الطريق نحو الحرية";
    levelBadge = "⚡";
    nextMilestone = 75;
  } else if (progress >= 25) {
    levelTitle = "قاهر الديون والالتزامات";
    levelBadge = "⚔️";
    nextMilestone = 50;
  } else if (progress >= 10) {
    levelTitle = "الملتزم الجاد بالسداد";
    levelBadge = "🛡️";
    nextMilestone = 25;
  }

  const targetAmount = Math.round((totalOriginal * nextMilestone) / 100);
  const remainingToNext = Math.max(0, targetAmount - totalRepaid);

  let message = "";
  if (progress >= 100) {
    message = "مبروك! تم سداد كامل الديون والأمانات بالكامل 🎉";
  } else {
    message = `متبقي للوصول لمحطة (${nextMilestone}%)`;
  }

  return {
    levelTitle,
    levelBadge,
    nextMilestonePercent: nextMilestone,
    remainingToNextMilestone: remainingToNext,
    message,
  };
}

export const REPAYMENT_CELEBRATION_MESSAGES = [
  "عاش يا بطل! كل جنيه يسقط من الدين يقربك خطوة للحرية وراحة البال 💪",
  "الله يؤدي عنك ويبارك لك في رزقك! خطوة ممتازة للأمام 🤲",
  "إنجاز حقيقي اليوم! وفاءك بأمانتك يرفع قدرك عند الله وعند أهلك 🌟",
  "استمر بنفس العزيمة، أنت تثبت لنفسك كل يوم أنك قد المسؤولية! 🚀",
  "دفعة مباركة! الضغط يقل والحرية تقترب بإذن الله 🎯",
];

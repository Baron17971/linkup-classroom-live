import "./globals.css";

export const metadata={
  title:"LinkUp — כולנו חלק מהשרשרת",
  description:"משחק כיתתי שיתופי שבו כל תלמיד הוא חוליה חשובה בשרשרת."
};

export default function RootLayout({children}){
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}

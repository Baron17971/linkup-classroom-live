import "./globals.css";

export const metadata={
  metadataBase:new URL("https://linkup-classroom-live.vercel.app"),
  title:"LinkUp — כולנו חלק מהשרשרת",
  description:"משחק כיתתי שיתופי שבו כל תלמיד הוא חוליה חשובה בשרשרת.",
  openGraph:{
    title:"LinkUp — כולנו חלק מהשרשרת",
    description:"הצטרפו למשחק הכיתתי והמשיכו יחד את השרשרת.",
    url:"https://linkup-classroom-live.vercel.app/",
    siteName:"LinkUp",
    images:[{
      url:"/home-desktop.png.png",
      width:1200,
      height:630,
      alt:"LinkUp — כולנו חלק מהשרשרת"
    }],
    locale:"he_IL",
    type:"website"
  },
  twitter:{
    card:"summary_large_image",
    title:"LinkUp — כולנו חלק מהשרשרת",
    description:"הצטרפו למשחק הכיתתי והמשיכו יחד את השרשרת.",
    images:["/home-desktop.png.png"]
  }
};

export default function RootLayout({children}){
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}

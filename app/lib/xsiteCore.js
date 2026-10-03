import { createClient } from "@supabase/supabase-js";

export const xsiteCore = createClient(
  "https://zydhfhfhspflvhlpmokj.supabase.co",
  "sb_publishable_DJN48TNChvPce3MZ7bDaiw_5Q8Eam6x",
  { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
);


export async function consumeXsiteAuthBridge(){
  if(typeof window==="undefined")return null;
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
  if(hash.get("oauth_bridge")!=="1")return null;
  const access_token=hash.get("access_token")||"";
  const refresh_token=hash.get("refresh_token")||"";
  if(!access_token||!refresh_token)return null;
  const {data,error}=await xsiteCore.auth.setSession({access_token,refresh_token});
  if(!error){
    window.history.replaceState({},document.title,window.location.pathname+window.location.search);
    return data.session||null;
  }
  return null;
}

export function redirectToXsiteGoogle(targetUrl, appId){
  if(typeof window==="undefined")return;
  const bridge="https://xsite-live.vercel.app/";
  const url=new URL(bridge);
  url.searchParams.set("auth_for",appId);
  url.searchParams.set("next",targetUrl);
  window.location.assign(url.toString());
}

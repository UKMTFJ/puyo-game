'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './gbp.module.css';
import {
  Sparkles, Search, Lightbulb, LogIn, CheckCircle2, RefreshCw,
  Image as ImageIcon, Upload, ChevronRight, Link, AlertCircle,
} from 'lucide-react';

interface PlaceInfo { name: string; website: string | null; address: string | null }
interface GeneratedPost { text: string; imagePrompt: string }

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 40) || 'default';
}

export default function GBPAutomationPage() {
  // Step 1: Store
  const [storeName, setStoreName] = useState('');
  const [storeId, setStoreId] = useState('default');
  const [isSearching, setIsSearching] = useState(false);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [snsUrls, setSnsUrls] = useState<Record<string, string>>({});

  // Step 2: OAuth
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [oauthError, setOauthError] = useState('');

  // Step 3: GBP data
  const [pastPosts, setPastPosts] = useState<string[]>([]);
  const [pastPostsText, setPastPostsText] = useState('');
  const [imageStyle, setImageStyle] = useState('');
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [quotaCooldown, setQuotaCooldown] = useState(0);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [screenshotAnalyzed, setScreenshotAnalyzed] = useState(false);

  // Step 4: Topics
  const [topic1, setTopic1] = useState('');
  const [topic2, setTopic2] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  // Step 5: Generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [posts, setPosts] = useState<[GeneratedPost, GeneratedPost] | null>(null);
  const [editText, setEditText] = useState(['', '']);
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [imageLoading, setImageLoading] = useState([false, false, false, false]);

  // Step 6: Review & Save
  const [safetyChecks, setSafetyChecks] = useState({ noPhone: false, noLogo: false, noFace: false, noDuplicate: false });
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ folderName: string } | null>(null);

  const TOOL_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

  const bookmarkletCode = `javascript:(async function(){
const BASE='${TOOL_ORIGIN}';
const tool=window.open(BASE+'/gbp','gbp-tool','width=1200,height=800');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(2000);
const s=document.createElement('script');
s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
document.head.appendChild(s);
await new Promise(r=>{s.onload=r;s.onerror=r});
try{
const canvas=await html2canvas(document.body,{scale:0.5,logging:false,useCORS:true,allowTaint:true});
const dataUrl=canvas.toDataURL('image/jpeg',0.75);
await wait(1000);
tool.postMessage({type:'GBP_SCREENSHOT',dataUrl},BASE);
}catch(e){alert('キャプチャに失敗しました: '+e.message);}
})();`.replace(/\n/g, '');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      setIsGoogleConnected(true);
      const s = params.get('store');
      if (s) setStoreId(s);
      window.history.replaceState({}, '', '/gbp');
    }
    const err = params.get('oauth_error');
    if (err) {
      setOauthError(err);
      window.history.replaceState({}, '', '/gbp');
    }

    const handler = async (e: MessageEvent) => {
      if (!['https://business.google.com', 'https://www.google.com', window.location.origin].includes(e.origin)) return;
      if (e.data?.type !== 'GBP_SCREENSHOT' || !e.data?.dataUrl) return;
      setIsAnalyzingScreenshot(true);
      setScreenshotAnalyzed(false);
      try {
        const res = await fetch(e.data.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'gbp-screenshot.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('screenshot', file);
        const apiRes = await fetch('/api/gbp/analyze-screenshot', { method: 'POST', body: formData });
        const data = await apiRes.json();
        if (data.error) throw new Error(data.error);
        if (data.posts?.length) { setPastPosts(data.posts); setPastPostsText(data.posts.join('\n')); }
        if (data.imageStyle) setImageStyle(data.imageStyle);
        setScreenshotAnalyzed(true);
      } catch { alert('スクリーンショットの解析に失敗しました。'); }
      finally { setIsAnalyzingScreenshot(false); }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleSearchPlace = async () => {
    if (!storeName) return;
    setIsSearching(true);
    setPlaceInfo(null);
    setSnsUrls({});
    const sid = slugify(storeName);
    setStoreId(sid);
    try {
      const res = await fetch('/api/gbp/search-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPlaceInfo(data);

      if (data.website) {
        const snsRes = await fetch('/api/gbp/extract-sns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl: data.website }),
        });
        const snsData = await snsRes.json();
        setSnsUrls(snsData);
      }
    } catch (e: any) {
      alert(e.message || '店舗情報の取得に失敗しました');
    } finally {
      setIsSearching(false);
    }
  };

  const startCooldown = useCallback((seconds: number, onDone: () => void) => {
    setQuotaCooldown(seconds);
    const tick = setInterval(() => {
      setQuotaCooldown(prev => {
        if (prev <= 1) { clearInterval(tick); onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleLoadGBPPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setNeedsAuth(false);
    try {
      const url = `/api/gbp/posts${storeName ? `?storeName=${encodeURIComponent(storeName)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.needsAuth) { setNeedsAuth(true); return; }
      if (data.quotaExceeded) {
        setIsLoadingPosts(false);
        startCooldown(62, handleLoadGBPPosts);
        return;
      }
      if (data.error) throw new Error(data.error);

      if (data.posts?.length) { setPastPosts(data.posts); setPastPostsText(data.posts.join('\n')); }
      if (data.imageStyle) setImageStyle(data.imageStyle);
      if (data.websiteUri && !placeInfo?.website) {
        setPlaceInfo(prev => ({ name: data.locationTitle ?? storeName, website: data.websiteUri, address: prev?.address ?? null }));
      }
      setIsGoogleConnected(true);
    } catch (e: any) {
      alert(e.message || 'GBP投稿の取得に失敗しました');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [storeName, placeInfo, startCooldown]);

  const handleAnalyzeStyle = async (files: FileList) => {
    if (!files.length) return;
    setIsAnalyzingStyle(true);
    try {
      const formData = new FormData();
      Array.from(files).slice(0, 3).forEach(f => formData.append('images', f));
      const res = await fetch('/api/gbp/analyze-style', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImageStyle(data.styleDescription);
    } catch { alert('画像スタイルの分析に失敗しました。'); }
    finally { setIsAnalyzingStyle(false); }
  };

  const handleSuggestTopics = async () => {
    const urls = [placeInfo?.website, ...Object.values(snsUrls)].filter(Boolean) as string[];
    if (urls.length === 0) { alert('先に店舗情報を検索してください'); return; }
    setIsSuggesting(true);
    setSuggestedTopics([]);
    try {
      const historyPosts = pastPostsText.split('\n').map(l => l.trim()).filter(Boolean);
      const res = await fetch('/api/gbp/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, pastPosts: historyPosts }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestedTopics(data.topics);
    } catch { alert('トピック提案の取得に失敗しました'); }
    finally { setIsSuggesting(false); }
  };

  const generateImage = async (index: number, prompt: string) => {
    setImageLoading(prev => { const n = [...prev]; n[index] = true; return n; });
    try {
      const res = await fetch('/api/gbp/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageStyle }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImages(prev => { const n = [...prev]; n[index] = data.imageUrl; return n; });
    } catch (e: any) {
      alert(`画像${index + 1}の生成に失敗しました: ${e.message}`);
    } finally {
      setImageLoading(prev => { const n = [...prev]; n[index] = false; return n; });
    }
  };

  const handleGenerate = async () => {
    if (!topic1 || !topic2) return;
    setIsGenerating(true);
    setPosts(null);
    setImages([null, null, null, null]);
    setSaveResult(null);
    setSafetyChecks({ noPhone: false, noLogo: false, noFace: false, noDuplicate: false });
    try {
      const history = pastPostsText.split('\n').map(l => l.trim()).filter(Boolean);
      const res = await fetch('/api/gbp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, topics: [topic1, topic2], imageStyle, storeName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const [p1, p2] = data.posts;
      setPosts([p1, p2]);
      setEditText([p1.text, p2.text]);

      // Generate all 4 images in parallel
      await Promise.all([
        generateImage(0, p1.imagePrompt),
        generateImage(1, p1.imagePrompt),
        generateImage(2, p2.imagePrompt),
        generateImage(3, p2.imagePrompt),
      ]);
    } catch (e: any) {
      alert(`生成に失敗しました: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const allChecked = Object.values(safetyChecks).every(Boolean);

  const handleSaveToDrive = async () => {
    if (!posts || !allChecked) return;
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/gbp/save-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: placeInfo?.name ?? storeName,
          topic1,
          post1Text: editText[0],
          post1Image1: images[0] ?? '',
          post1Image2: images[1] ?? '',
          topic2,
          post2Text: editText[1],
          post2Image1: images[2] ?? '',
          post2Image2: images[3] ?? '',
          imageStyle,
          snsUrls,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaveResult({ folderName: data.folderName });
    } catch (e: any) {
      alert(`Driveへの保存に失敗しました: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const s = (v: string) => v ? `✓ ${v}` : '—';

  return (
    <main className={styles.container}>
      <div className="glow" />
      <header className={styles.header}>
        <div className={styles.aiBadge}>AI Powered</div>
        <h1 className={styles.title}>GBP Post Automator</h1>
        <p className={styles.subtitle}>過去投稿を分析し、ブランドのニュアンスを保ちながら被りのない投稿を2件＋画像を自動生成します。</p>
      </header>

      <div className={styles.grid}>
        {/* ─── LEFT COLUMN ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* STEP 1: Store Search */}
          <div className={`${styles.card} glass`}>
            <h2 className={styles.sectionTitle}><Search size={20} /> STEP 1：店舗情報</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className={styles.input}
                placeholder="例: 〇〇カフェ 渋谷店"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchPlace()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={handleSearchPlace} disabled={!storeName || isSearching} style={{ whiteSpace: 'nowrap' }}>
                {isSearching ? '検索中...' : '検索'}
              </button>
            </div>
            {placeInfo && (
              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ fontWeight: 600 }}>{placeInfo.name}</div>
                {placeInfo.address && <div style={{ opacity: 0.6 }}>{placeInfo.address}</div>}
                {placeInfo.website && <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Link size={12} /> {placeInfo.website}</div>}
                {Object.entries(snsUrls).map(([k, v]) => (
                  <div key={k} style={{ color: 'var(--primary)', opacity: 0.8, fontSize: '0.8rem' }}>✓ {k}: {v}</div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: Google OAuth */}
          <div className={`${styles.card} glass`}>
            <h2 className={styles.sectionTitle}><LogIn size={20} /> STEP 2：Googleアカウント連携</h2>
            {oauthError && (
              <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#f87171', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} /> OAuth エラー: {oauthError}
              </div>
            )}
            {isGoogleConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e' }}>
                <CheckCircle2 size={18} /> Google連携済み
              </div>
            ) : (
              <a
                href={`/api/gbp/google-auth?storeId=${encodeURIComponent(storeId)}`}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
              >
                <LogIn size={16} /> Googleでログイン
              </a>
            )}

            {quotaCooldown > 0 ? (
              <div style={{ padding: '0.75rem', background: 'rgba(234,179,8,0.1)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.875rem' }}>
                クォータ超過 — {quotaCooldown}秒後に自動リトライ...
              </div>
            ) : (
              <button
                className="btn-primary"
                onClick={handleLoadGBPPosts}
                disabled={isLoadingPosts}
                style={{ width: '100%' }}
              >
                {isLoadingPosts ? '取得中...' : 'GBP投稿を取得する'}
              </button>
            )}

            {needsAuth && (
              <div style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={14} /> 上の「Googleでログイン」ボタンで認証してから再度「GBP投稿を取得する」を押してください
              </div>
            )}
          </div>

          {/* STEP 3: Past Posts & Image Style */}
          <div className={`${styles.card} glass`}>
            <h2 className={styles.sectionTitle}><ImageIcon size={20} /> STEP 3：過去投稿・スタイル</h2>

            {/* Bookmarklet */}
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>GBP管理画面から自動取得（ブックマークレット）</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a href={bookmarkletCode} onClick={e => e.preventDefault()} draggable className="btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', cursor: 'grab' }}>
                  📸 GBPキャプチャ
                </a>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>← ブックマークバーへドラッグ</span>
              </div>
              {isAnalyzingScreenshot && <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>AI解析中...</p>}
              {screenshotAnalyzed && <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22c55e', fontSize: '0.85rem' }}><CheckCircle2 size={14} /> 解析完了</div>}
            </div>

            {/* Manual past posts */}
            <div>
              <p style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.4rem' }}>または手動で過去投稿を貼り付け（1行1件）</p>
              <textarea
                className={styles.input}
                placeholder={'新メニューのいちごパフェが登場！\nGW期間中も休まず営業しています。'}
                value={pastPostsText}
                onChange={e => { setPastPostsText(e.target.value); setPastPosts(e.target.value.split('\n').filter(Boolean)); }}
                rows={4}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, width: '100%' }}
              />
            </div>

            {/* Image style */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>画像スタイル</p>
                <label style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Upload size={12} />
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && handleAnalyzeStyle(e.target.files)} />
                  {isAnalyzingStyle ? '分析中...' : '画像からAI分析'}
                </label>
              </div>
              <textarea
                className={styles.input}
                placeholder="画像スタイルの説明（自動入力されます）"
                value={imageStyle}
                onChange={e => setImageStyle(e.target.value)}
                rows={2}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem', width: '100%' }}
              />
            </div>
          </div>

          {/* STEP 4: Topics */}
          <div className={`${styles.card} glass`}>
            <h2 className={styles.sectionTitle}><Lightbulb size={20} /> STEP 4：投稿トピック（2件）</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                className={styles.input}
                placeholder="トピック1（例: 夏の新作ドリンク）"
                value={topic1}
                onChange={e => setTopic1(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="トピック2（例: 雨の日キャンペーン）"
                value={topic2}
                onChange={e => setTopic2(e.target.value)}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleSuggestTopics}
              disabled={isSuggesting || !placeInfo}
              style={{ width: '100%' }}
            >
              {isSuggesting ? '提案中...' : 'AIにトピックを提案してもらう'} <Lightbulb size={14} />
            </button>

            {suggestedTopics.length > 0 && (
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>クリックして入力欄にセット:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {suggestedTopics.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { if (!topic1 || topic1 === t) { setTopic1(t); } else { setTopic2(t); } }}
                      style={{ padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--glass-border)', background: (topic1 === t || topic2 === t) ? 'var(--primary)' : 'var(--glass-bg)', color: 'inherit', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* STEP 5: Generate */}
          <div className={`${styles.card} glass`}>
            <h2 className={styles.sectionTitle}><Sparkles size={20} /> STEP 5：投稿生成</h2>
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!topic1 || !topic2 || isGenerating}
              style={{ width: '100%' }}
            >
              {isGenerating ? '生成中...' : '2件の投稿＋画像を生成する'} <ChevronRight size={18} />
            </button>

            {isGenerating && (
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
                テキスト生成 → 画像生成（4枚）... しばらくお待ちください
              </div>
            )}
          </div>

          {/* Post 1 */}
          {posts && (
            <div className={`${styles.card} glass`}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>投稿1</span>
                {topic1}
              </h3>

              <textarea
                className={styles.input}
                value={editText[0]}
                onChange={e => setEditText(prev => [e.target.value, prev[1]])}
                rows={6}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, width: '100%' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ position: 'relative' }}>
                    {imageLoading[i] ? (
                      <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        生成中...
                      </div>
                    ) : images[i] ? (
                      <>
                        <img src={images[i]!} alt={`Post1 image ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px' }} />
                        <button
                          onClick={() => generateImage(i, posts[0].imagePrompt)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '4px 6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <RefreshCw size={11} /> 再生成
                        </button>
                      </>
                    ) : (
                      <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                        <ImageIcon size={24} style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post 2 */}
          {posts && (
            <div className={`${styles.card} glass`}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: 'rgba(139,92,246,0.7)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>投稿2</span>
                {topic2}
              </h3>

              <textarea
                className={styles.input}
                value={editText[1]}
                onChange={e => setEditText(prev => [prev[0], e.target.value])}
                rows={6}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, width: '100%' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[2, 3].map(i => (
                  <div key={i} style={{ position: 'relative' }}>
                    {imageLoading[i] ? (
                      <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
                        生成中...
                      </div>
                    ) : images[i] ? (
                      <>
                        <img src={images[i]!} alt={`Post2 image ${i - 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px' }} />
                        <button
                          onClick={() => generateImage(i, posts[1].imagePrompt)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', padding: '4px 6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <RefreshCw size={11} /> 再生成
                        </button>
                      </>
                    ) : (
                      <div style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                        <ImageIcon size={24} style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: Review & Save */}
          {posts && (
            <div className={`${styles.card} glass`}>
              <h2 className={styles.sectionTitle}><CheckCircle2 size={20} /> STEP 6：レビュー＆保存</h2>
              <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                以下を確認してチェックを入れてください。全項目チェック後にDriveへ保存できます。
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {([
                  ['noPhone', '電話番号・個人情報が含まれていないことを確認した'],
                  ['noLogo', '実在するロゴ・商標が含まれていないことを確認した'],
                  ['noFace', '実在スタッフの顔・店内特定可能な写真が含まれていないことを確認した'],
                  ['noDuplicate', '過去投稿と内容が重複していないことを確認した'],
                ] as const).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={safetyChecks[key]}
                      onChange={e => setSafetyChecks(prev => ({ ...prev, [key]: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                className="btn-primary"
                onClick={handleSaveToDrive}
                disabled={!allChecked || isSaving}
                style={{ width: '100%', opacity: allChecked ? 1 : 0.4, cursor: allChecked ? 'pointer' : 'not-allowed' }}
              >
                {isSaving ? '保存中...' : 'Google Driveに保存する（8ファイル）'}
              </button>

              {saveResult && (
                <div style={{ padding: '0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="#22c55e" />
                  <span style={{ fontSize: '0.875rem', color: '#22c55e' }}>
                    Driveへ保存しました → GBP_Automation_Outputs/{placeInfo?.name ?? storeName}/{saveResult.folderName}/
                  </span>
                </div>
              )}

              <p style={{ fontSize: '0.75rem', opacity: 0.4, textAlign: 'center' }}>
                ※ GBPへの自動投稿は行いません。Driveのファイルを確認後、手動で投稿してください。
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

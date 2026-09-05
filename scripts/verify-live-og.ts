async function test() {
  const q = await fetch('https://supersec.mjbalubar.tech/q/qMLs9Dku88Oa');
  const qText = await q.text();
  console.log('Q&A Status:', q.status);
  console.log('Q&A Title:', qText.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('Q&A OG Title:', qText.match(/<meta property="og:title" content="(.*?)"/)?.[1]);
  console.log('Q&A OG Image:', qText.match(/<meta property="og:image" content="(.*?)"/)?.[1]);

  const r = await fetch('https://supersec.mjbalubar.tech/r/LbTUmb5QfHjT');
  const rText = await r.text();
  console.log('\nResource Status:', r.status);
  console.log('Resource Title:', rText.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('Resource OG Title:', rText.match(/<meta property="og:title" content="(.*?)"/)?.[1]);
  console.log('Resource OG Image:', rText.match(/<meta property="og:image" content="(.*?)"/)?.[1]);

  const a = await fetch('https://supersec.mjbalubar.tech/a/wZqXVKLoCRv_');
  const aText = await a.text();
  console.log('\nAnnouncement Status:', a.status);
  console.log('Announcement Title:', aText.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('Announcement OG Title:', aText.match(/<meta property="og:title" content="(.*?)"/)?.[1]);
  console.log('Announcement OG Image:', aText.match(/<meta property="og:image" content="(.*?)"/)?.[1]);
  const s1 = await fetch('https://supersec.mjbalubar.tech/s/gsl_ywvWRr6G', { redirect: 'manual' });
  console.log('\ns/gsl_ywvWRr6G (no slash) Status:', s1.status, 'Location:', s1.headers.get('location'));
  
  const s1Slash = await fetch('https://supersec.mjbalubar.tech/s/gsl_ywvWRr6G/', { redirect: 'manual' });
  const s1Text = await s1Slash.text();
  console.log('\ns/gsl_ywvWRr6G/ Status:', s1Slash.status);
  console.log('s/gsl_ywvWRr6G/ Title:', s1Text.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ OG Title:', s1Text.match(/<meta property="og:title" content="(.*?)"/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ OG Image:', s1Text.match(/<meta property="og:image" content="(.*?)"/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ OG URL:', s1Text.match(/<meta property="og:url" content="(.*?)"/)?.[1]);

  console.log('s/gsl_ywvWRr6G/ OG Image Type:', s1Text.match(/<meta property="og:image:type" content="(.*?)"/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ OG Image Width:', s1Text.match(/<meta property="og:image:width" content="(.*?)"/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ OG Image Height:', s1Text.match(/<meta property="og:image:height" content="(.*?)"/)?.[1]);
  console.log('s/gsl_ywvWRr6G/ Canonical:', s1Text.match(/<link rel="canonical" href="(.*?)"/)?.[1]);

  const s2 = await fetch('https://supersec.mjbalubar.tech/s/gsI_ywvWRr6G', { redirect: 'manual' });
  console.log('\ns/gsI_ywvWRr6G (no slash) Status:', s2.status, 'Location:', s2.headers.get('location'));

  const s2Slash = await fetch('https://supersec.mjbalubar.tech/s/gsI_ywvWRr6G/', { redirect: 'manual' });
  const s2Text = await s2Slash.text();
  console.log('\ns/gsI_ywvWRr6G/ Status:', s2Slash.status);
  console.log('s/gsI_ywvWRr6G/ Title:', s2Text.match(/<title>(.*?)<\/title>/)?.[1]);
  console.log('s/gsI_ywvWRr6G/ OG Title:', s2Text.match(/<meta property="og:title" content="(.*?)"/)?.[1]);
  console.log('s/gsI_ywvWRr6G/ OG Image:', s2Text.match(/<meta property="og:image" content="(.*?)"/)?.[1]);
  console.log('s/gsI_ywvWRr6G/ OG Image Type:', s2Text.match(/<meta property="og:image:type" content="(.*?)"/)?.[1]);
  console.log('s/gsI_ywvWRr6G/ OG Image Width:', s2Text.match(/<meta property="og:image:width" content="(.*?)"/)?.[1]);
  console.log('s/gsI_ywvWRr6G/ OG Image Height:', s2Text.match(/<meta property="og:image:height" content="(.*?)"/)?.[1]);

  const imgRes = await fetch('https://supersec.mjbalubar.tech/og/subject-gsl_ywvWRr6G.jpg');
  console.log('\nog/subject-gsl_ywvWRr6G.jpg Status:', imgRes.status, 'Content-Type:', imgRes.headers.get('content-type'), 'Content-Length:', imgRes.headers.get('content-length'));
}

test().catch(console.error);

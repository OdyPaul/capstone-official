// src/pages/TorDesigner.jsx
import { useEffect, useRef, useState } from 'react';
import { Designer } from '@pdfme/ui';
import { text, image, line,table  } from '@pdfme/schemas';
import torBaseUrl from '../../assets/pdf/template-tor.pdf?url';

export default function TorDesigner() {
  const containerRef = useRef(null);
  const designerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch(torBaseUrl);
        if (!res.ok) throw new Error(`Failed to fetch base PDF: ${res.status}`);
        const basePdf = await res.arrayBuffer();

        if (!mounted || !containerRef.current) return;

        const d = new Designer({
          domContainer: containerRef.current,
          template: {
            basePdf,
            schemas: [[]],
            sampledata: [
                {
                fullName: "",
                address: "",
                entranceCredentials: "",
                highSchool: "",
                program: "",
                major: "",
                placeOfBirth: "",
                dateAdmission: "",
                dateOfBirth: "",
                dateGraduated: "",
                dateIssued: "",
                rows_page1: [],
                rows_page2: []
                }
            ],
            },

          plugins: { text, image, line,table },
        });

        designerRef.current = d;
        setReady(true);
      } catch (err) {
        console.error('[TorDesigner] init error:', err);
      }
    })();

    return () => {
      mounted = false;
      if (designerRef.current) {
        try { designerRef.current.destroy(); } catch {}
        designerRef.current = null;
      }
    };
  }, []);

  const handleExport = () => {
    const d = designerRef.current;
    if (!d) return;
    const tpl = d.getTemplate();
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = async (file) => {
    const d = designerRef.current;
    if (!d || !file) return;
    const txt = await file.text();
    d.updateTemplate(JSON.parse(txt));
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 8, borderBottom: '1px solid #eee' }}>
        <button onClick={handleExport} disabled={!ready}>Export template</button>
        <label style={{ marginLeft: 12 }}>
          Import template
          <input
            type="file"
            accept="application/json"
            style={{ marginLeft: 8 }}
            onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
        </label>
      </div>
      <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}


import { useState } from 'react';
import type { NextPage } from 'next';

const Home: NextPage = () => {
  const [isLargeFont, setIsLargeFont] = useState(false);

  return (
    <div className={`${isLargeFont ? 'text-base' : 'text-sm'} font-mono bg-white text-teal-900 p-6 max-w-3xl mx-auto`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-bold">louis boucherie</h1>
        <button
          onClick={() => setIsLargeFont(!isLargeFont)}
          className="border border-teal-900 rounded px-2 py-1 text-teal-900 hover:bg-teal-50"
        >
          Toggle Text Size
        </button>
      </div>

      <h2 className="font-normal mb-6"></h2>

      <div className="mb-8 space-y-2">
        <a
          href="mailto:louibo@dtu.dk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline block"
        >
          louibo[at]dtu.dk
        </a>
        <a
          href="https://scholar.google.com/citations?user=UtfTBZ4AAAAJ&hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline block"
        >
          publications
        </a>
        <a
          href="https://github.com/LCB0B"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline block"
        >
          codes
        </a>
        <div className="mt-2 space-x-2">
          <a
            href="https://twitter.com/LCB0B"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            twitter
          </a>
          <a
            href="https://www.linkedin.com/in/louis-boucherie"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            linkedin
          </a>
          <a
            href="https://bsky.app/profile/lcbob.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            bluesky
          </a>
        </div>
      </div>

      <p className="mb-4">
        <b>about:</b> i work at the technical university of denmark and statistics denmark,
        studying human behavior and social networks using machine learning.
      </p>

      <p className="mb-4">
        <b>last preprint:</b>{' '}
        <a
          href="https://arxiv.org/pdf/2405.08746"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline"
        >
          decomposing geographical and universal aspects of human mobility
        </a>
      </p>

      <p>
        <b>visualization:</b>{' '}
        <a
          href="fashion.html"
          className="text-blue-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          fashion
        </a>
      </p>
    </div>
  );
};

export default Home;

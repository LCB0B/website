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

      {/* Bottom icon bar */}
      <div className="flex flex-wrap justify-start items-center space-x-4 mt-6">
        {/* GitHub Logo */}
        <a
          href="https://github.com/LCB0B"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-900 hover:text-teal-700"
          aria-label="GitHub"
        >
          <svg
            className="w-5 h-5 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577v-2.17c-3.338.724-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.084-.729.084-.729 1.205.084 1.84 1.235 1.84 1.235 1.07 1.834 2.809 1.304 3.495.997.107-.776.418-1.305.76-1.605-2.665-.303-5.466-1.334-5.466-5.933 0-1.312.469-2.382 1.236-3.22-.123-.303-.536-1.523.116-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.399 3-.404 1.02.005 2.04.137 3 .404 2.29-1.552 3.297-1.23 3.297-1.23.654 1.653.242 2.873.119 3.176.77.838 1.236 1.908 1.236 3.22 0 4.61-2.803 5.625-5.476 5.92.43.372.823 1.102.823 2.222v3.293c0 .318.22.69.825.573C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
          </svg>
        </a>

        {/* Twitter Logo */}
        <a
          href="https://twitter.com/LCB0B"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-900 hover:text-teal-700"
          aria-label="Twitter"
        >
          <svg
            className="w-5 h-5 fill-current"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M23.953 4.569c-.885.389-1.83.654-2.825.775 1.014-.611 1.794-1.574 2.163-2.723-.951.555-2.005.959-3.127 1.184-.897-.957-2.178-1.555-3.594-1.555-2.72 0-4.924 2.203-4.924 4.917 0 .39.045.765.127 1.124-4.09-.205-7.72-2.165-10.148-5.144-.424.722-.666 1.561-.666 2.475 0 1.71.87 3.213 2.188 4.096-.807-.026-1.566-.248-2.228-.616v.062c0 2.386 1.693 4.374 3.946 4.829-.413.111-.849.171-1.296.171-.314 0-.621-.03-.916-.086.631 1.953 2.445 3.377 4.6 3.416-1.68 1.319-3.809 2.105-6.115 2.105-.398 0-.79-.023-1.175-.069 2.179 1.397 4.768 2.21 7.557 2.21 9.054 0 14.001-7.496 14.001-13.986 0-.21 0-.42-.015-.63.961-.694 1.8-1.562 2.46-2.549z" />
          </svg>
        </a>

        {/* Bluesky Logo (Minimal cloud) */}
        <a
          href="https://bsky.app/profile/lcbob.bsky.social"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-900 hover:text-teal-700"
          aria-label="Bluesky"
        >
          <svg
            className="w-5 h-5 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
          >
            <path d="M218.3 100.3c-22.9 3.7-42.9 17.7-55.9 38.7-5.8 9.9-11.4 26-11.4 35.1 0 3.3-2.5 3.9-13.7 3.9-44.6 0-81.2 29.3-95.4 74.2-9.2 29.7-3.1 60.4 16 85.6 12.1 15.9 33.1 31 51.7 37 11.6 4.1 17.2 4.8 32 4.4 12.6-.3 21.8-1.3 33.9-3.8 2.3-.5 3.2.1 4.6 2.4 17.4 29.9 50.5 48.6 85.2 48.6 44.6 0 82-26.5 96-68.4 5.6-17.1 5.7-36.7.3-53.3-1.5-4.6-2.7-8.6-2.7-8.9 0-.3 3.4-.5 7.5-.5 20.6 0 40.9-7 57.3-19.7 18.6-14.1 32.3-34.3 38.5-56.9 3.2-11.4 3.1-33.3-.3-44.7-8.9-30.1-31-54.1-60.1-66.3-17.3-7.1-27-8.6-51.1-8.1-21.9.4-33.8 3.1-52.8 12.1-2.9 1.4-5.5 2.4-5.7 2.2-.1-.1.3-2.4 1.1-5 3-11.4 3.7-25 1.8-36-2.5-15.2-8.4-31.6-13.7-37.5-4.5-5.1-13.4-11.1-19.5-13.1-10.5-3.7-26.2-5.1-35.3-2.9z"/>
          </svg>
        </a>

        {/* Google Scholar Logo (Graduation Cap) */}
        <a
          href="https://scholar.google.com/citations?user=UtfTBZ4AAAAJ&hl=en"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-900 hover:text-teal-700"
          aria-label="Google Scholar"
        >
          <svg
            className="w-5 h-5 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 512"
          >
            <path d="M622.34 153.3 343.39 3.4a63.92 63.92 0 0 0-46.78 0L17.62 153.3C6.6 158.87 0 170.32 0 182.59s6.6 23.7 17.62 29.29l80.39 40.23v79.48c0 35.82 22 68.29 55.74 82.06l162.77 59.74c13.72 5 29-5 29-19.22V335.51l196.52-98.34c5.44-2.72 8.84-8.28 8.84-14.39 0-6.11-3.4-11.67-8.84-14.39L352 158.51v-23.24l252.34 126.17c11 5.59 24.8 5.59 35.87 0 11.3-5.61 20.22-19 20.22-31.42 0-12.27-8.92-25.66-20.09-31.72z"/>
          </svg>
        </a>

        {/* LinkedIn Logo */}
        <a
          href="https://www.linkedin.com/in/louis-boucherie"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-900 hover:text-teal-700"
          aria-label="LinkedIn"
        >
          <svg
            className="w-5 h-5 fill-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
          >
            <path d="M100.28 448H7.4V149.4h92.88zm-46.44-341a53.69 53.69 0 1 1 53.69 53.69 53.7 53.7 0 0 1-53.69-53.69zM447.92 448h-92.68V302.4c0-34.7-.69-79.31-48.31-79.31-48.36 0-55.78 37.77-55.78 76.73V448h-92.8V149.4h89.2v40.8h1.28c12.42-23.5 42.68-48.31 87.92-48.31 94 0 111.2 61.88 111.2 142.3V448z"/>
          </svg>
        </a>
      </div>

      <div className="pt-6 text-xs text-center text-teal-900">
        © 2023 Louis. All Rights Reserved.
      </div>
    </div>
  );
};

export default Home;


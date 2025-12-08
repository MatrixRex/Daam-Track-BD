/**
 * BuildInfo Component
 * Displays build version information (commit hash and build date)
 * Shows placeholder in dev mode for style debugging
 */

const BuildInfo = () => {
    const buildSha = import.meta.env.VITE_BUILD_SHA;
    const buildDate = import.meta.env.VITE_BUILD_DATE;

    // Check if we're in dev mode (env variables missing)
    const isDevMode = !buildSha || !buildDate;

    // Shorten commit hash to 7 characters for display
    const shortSha = isDevMode ? 'dev' : buildSha.slice(0, 7);
    const displayDate = isDevMode ? 'local' : buildDate;

    // Construct the GitHub commit URL (only valid in production)
    const commitUrl = isDevMode
        ? null
        : `https://github.com/MatrixRex/Daam-Track-BD/commit/${buildSha}`;

    // Render the hash as a link in production, plain text in dev
    const hashElement = commitUrl ? (
        <a
            href={commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:underline transition-colors"
        >
            {shortSha}
        </a>
    ) : (
        <span className="font-mono">{shortSha}</span>
    );

    return (
        <div className="fixed bottom-2 right-4 text-[10px] text-[#8B7E6B]/60 dark:text-[#6B5B95]/60 z-20 flex items-center gap-1.5">
            <span>Build:</span>
            {hashElement}
            <span>•</span>
            <span>{displayDate}</span>
        </div>
    );
};

export default BuildInfo;

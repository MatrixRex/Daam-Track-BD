/**
 * BuildInfo Component
 * Displays build version information (commit hash and build date)
 * Shows placeholder in dev mode for style debugging
 */

const BuildInfo = () => {
    const buildTag = import.meta.env.VITE_BUILD_TAG;
    const buildSha = import.meta.env.VITE_BUILD_SHA;
    const buildDate = import.meta.env.VITE_BUILD_DATE;

    // Check if we're in dev mode (env variables missing)
    const isDevMode = !buildTag || !buildDate;

    // Use tag if available, otherwise 'dev'
    const displayVersion = isDevMode ? 'dev' : buildTag;
    const displayDate = isDevMode ? 'local' : buildDate;

    // Construct the GitHub tag/release URL
    const tagUrl = isDevMode
        ? null
        : `https://github.com/MatrixRex/Daam-Track-BD/releases/tag/${buildTag}`;

    // Render the tag as a link in production, plain text in dev
    const versionElement = tagUrl ? (
        <a
            href={tagUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:underline transition-colors"
            title={`Commit: ${buildSha}`}
        >
            {displayVersion}
        </a>
    ) : (
        <span className="font-mono">{displayVersion}</span>
    );

    return (
        <div className="fixed bottom-2 right-4 text-[10px] text-[#8B7E6B]/60 dark:text-[#6B5B95]/60 z-20 flex items-center gap-1.5">
            <span>Community project by</span>
            <a 
                href="https://github.com/MatrixRex/Daam-Track-BD" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline transition-colors"
            >
                MatrixRex
            </a>
            <span>•</span>
            <span>Version:</span>
            {versionElement}
            <span>•</span>
            <span>{displayDate}</span>
        </div>
    );
};

export default BuildInfo;

import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="relative w-10 h-10 rounded-lg bg-muted hover:bg-primary/10 transition-all duration-300 group overflow-hidden border border-border motion-preset-fade motion-duration-300 flex items-center justify-center font-bold text-xs select-none text-primary"
            title={language === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
            aria-label={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
        >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400/10 to-primary-500/10 blur-xl opacity-100" />
            
            <span className="relative z-10 text-[13px] tracking-wider">
                {language === 'en' ? 'বাং' : 'EN'}
            </span>
        </button>
    );
};

export default LanguageToggle;

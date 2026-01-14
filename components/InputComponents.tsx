
import React, { useRef } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = 
  ({ className = '', variant = 'primary', ...props }) => {
    const baseStyle = "px-4 md:px-6 py-2 md:py-2.5 rounded-sm font-black text-[10px] md:text-[11px] uppercase tracking-[0.15em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 md:gap-3 shadow-md";
    const variants = {
      primary: "bg-zinc-950 text-white hover:bg-black border border-transparent",
      secondary: "bg-white text-zinc-950 border border-zinc-200 hover:border-zinc-950 shadow-sm",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-red-900/10",
      outline: "border-2 border-zinc-950 text-zinc-950 bg-transparent hover:bg-zinc-950 hover:text-white"
    };
    return <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props} />;
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = 
  ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] leading-none mb-1 ml-0.5 whitespace-nowrap">{label}</label>}
    <input className={`border border-zinc-200 rounded-sm px-3 py-2 focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 outline-none bg-white text-sm md:text-base font-black text-zinc-900 placeholder-zinc-200 transition-all disabled:bg-zinc-50 shadow-sm ${className}`} {...props} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = 
  ({ label, className = '', children, ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] leading-none mb-1 ml-0.5 whitespace-nowrap">{label}</label>}
    <select className={`border border-zinc-200 rounded-sm px-3 py-2 focus:ring-2 focus:ring-zinc-950/5 focus:border-zinc-950 outline-none bg-white text-sm md:text-base font-black text-zinc-900 transition-all shadow-sm ${className}`} {...props}>
      {children}
    </select>
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: React.ReactNode; action?: React.ReactNode }> = 
  ({ children, className = '', title, action }) => (
  <div className={`bg-white rounded-sm shadow-sm border border-zinc-100 overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-zinc-50 flex justify-between items-center bg-white whitespace-nowrap">
        {title && (
          <div className="flex flex-col mr-3">
            {typeof title === 'string' ? (
              <>
                <h3 className="font-black text-zinc-950 text-sm md:text-base uppercase tracking-wider leading-tight">
                  {title.split(' / ')[0]}
                </h3>
                {title.includes(' / ') && (
                  <span className="text-[8px] md:text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em] mt-1 leading-tight">
                    {title.split(' / ')[1]}
                  </span>
                )}
              </>
            ) : (
              title
            )}
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className="p-4 md:p-6">{children}</div>
  </div>
);

export const ImageUploader: React.FC<{ 
  images: string[]; 
  onImagesChange: (newImages: string[]) => void;
  maxImages?: number;
}> = ({ images, onImagesChange, maxImages = 6 }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const remainingSlots = maxImages - images.length;
      const filesToProcess = files.slice(0, remainingSlots);

      const promises = filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              resolve('');
            }
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(newBase64Images => {
        const validImages = newBase64Images.filter(img => img !== '');
        if (validImages.length > 0) {
          onImagesChange([...images, ...validImages]);
        }
      });
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 md:gap-3">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square rounded-sm overflow-hidden border border-zinc-100 group bg-zinc-50">
            <img src={img} alt={`Log ${idx}`} className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
              className="absolute top-1 right-1 bg-zinc-950/80 text-white rounded-full p-1 hover:bg-red-600 transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-sm hover:border-zinc-950 hover:bg-zinc-50 transition-all text-zinc-300 hover:text-zinc-950 gap-1 shadow-inner group"
          >
            <Camera size={18} className="md:size-20 group-hover:scale-110 transition-transform" />
            <span className="text-[7px] font-black tracking-widest uppercase">ADD</span>
          </button>
        )}
      </div>
      <input type="file" accept="image/*" multiple ref={inputRef} className="hidden" onChange={handleFileChange} />
    </div>
  );
};

import React from 'react';
import { X, Palette, Sparkles, Check, Car } from 'lucide-react';
import { CarCustomization } from '../types/game';

interface GarageModalProps {
  currentCustomization: CarCustomization;
  onSelectCustomization: (custom: CarCustomization) => void;
  onClose: () => void;
}

const PRESET_SKINS = [
  {
    name: 'Sunset Cyber (Video Original)',
    paintColor: '#f06292',
    underglowColor: '#00f0ff',
    plateText: 'JESSE',
    description: 'The iconic retro synthwave pink & cyan livery featured in the video.',
  },
  {
    name: 'Jesse Gold Edition',
    paintColor: '#eab308',
    underglowColor: '#ff007f',
    plateText: 'JESSE',
    description: 'Luxury polished gold finish with high-intensity magenta underglow.',
  },
  {
    name: 'Obsidian Stealth',
    paintColor: '#1e222d',
    underglowColor: '#00ffff',
    plateText: '6228',
    description: 'Matte dark carbon chassis with pulsing cyber cyan ground effects.',
  },
  {
    name: 'Electric Miami',
    paintColor: '#00e5ff',
    underglowColor: '#ff00aa',
    plateText: 'JESSE',
    description: 'Vibrant neon blue with hot pink underglow and white racing trim.',
  },
  {
    name: 'Acid Matrix',
    paintColor: '#10b981',
    underglowColor: '#a855f7',
    plateText: 'JESSE',
    description: 'Cyber green metallic body with deep ultraviolet undercarriage lights.',
  },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  currentCustomization,
  onSelectCustomization,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0e111d] border border-white/15 text-white shadow-2xl p-6 sm:p-8 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-orbitron font-black text-2xl text-white">Jesse's Garage</h2>
            <p className="text-xs text-gray-400 font-rajdhani font-semibold">Select your Cyber Roadster Paint & Underglow</p>
          </div>
        </div>

        {/* Preset Skins */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {PRESET_SKINS.map((skin) => {
            const isSelected = currentCustomization.name === skin.name;
            return (
              <div
                key={skin.name}
                onClick={() => onSelectCustomization(skin)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-pink-500/15 border-pink-400 shadow-lg'
                    : 'bg-white/[0.04] border-white/10 hover:border-white/25 hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Color preview swatch */}
                  <div className="relative w-12 h-12 rounded-xl border border-white/20 overflow-hidden flex flex-col shadow-md">
                    <div className="h-2/3 w-full" style={{ backgroundColor: skin.paintColor }} />
                    <div className="h-1/3 w-full" style={{ backgroundColor: skin.underglowColor }} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-orbitron font-bold text-sm text-white">
                        {skin.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{skin.description}</p>
                    <div className="text-[10px] font-mono text-cyan-300 mt-1">
                      Plate: [{skin.plateText}] • Subtitle: @jessej6228
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="p-1.5 rounded-full bg-pink-500 text-white">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-white/20" />
                )}
              </div>
            );
          })}
        </div>

        {/* Note on Jesse Branding */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>License Plate & Signage:</span>
          <span className="font-mono text-pink-400 font-bold">JESSE @jessej6228</span>
        </div>
      </div>
    </div>
  );
};

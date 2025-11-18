import Image from "next/image";
import LogoPng from '@/components/icons/logo.png';

export const LogoIcon = ({ width = 60, height = 60, ...props }: any) => {
  return (
    <div style={{ width, height, position: 'relative' }}>
      <Image
        src={LogoPng}
        alt="logo"
        layout="fill"
        objectFit="contain"
        unoptimized
        {...props}
      />
    </div>
  );
};
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type CommonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'gold' | 'disabled';
  className?: string;
};

type LinkButtonProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type NativeButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

const variants = {
  primary: 'border-ink bg-ink text-white hover:bg-black',
  secondary: 'border-ink bg-transparent text-ink hover:bg-ink hover:text-white',
  light: 'border-white bg-white text-ink hover:bg-zinc-100',
  gold: 'border-gold bg-transparent text-gold hover:bg-gold hover:text-deep',
  disabled: 'cursor-not-allowed border-line bg-zinc-100 text-muted'
};

function isLinkButton(props: LinkButtonProps | NativeButtonProps): props is LinkButtonProps {
  return typeof (props as LinkButtonProps).href === 'string';
}

export function Button(props: LinkButtonProps | NativeButtonProps) {
  const base =
    'inline-flex min-h-12 w-full items-center justify-center rounded-[2px] border px-5 py-3 text-center font-sans text-sm font-semibold leading-none transition-colors duration-150 sm:w-auto';

  if (isLinkButton(props)) {
    const { children, variant = 'primary', className = '', href, ...anchorProps } = props;
    const classes = `${base} ${variants[variant]} ${className}`;
    return (
      <Link className={classes} href={href} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { children, variant = 'primary', className = '', ...buttonProps } = props as NativeButtonProps;
  const classes = `${base} ${variants[variant]} ${className}`;

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

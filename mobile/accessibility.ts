// No font scaling cap: reflow the native navigation and onboarding at large OS text sizes.
export function useStackedLayout(width:number,fontScale:number):boolean{return width<360||fontScale>=1.3}

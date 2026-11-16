import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useSettings } from './settings';

/** True when the system "Reduce Motion" setting or the app's Settings toggle is on: skip animations. */
export function useReduceMotion(): boolean {
  const appSetting = useSettings().reduceMotion;
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce || appSetting;
}

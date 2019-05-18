import Hooks, { registerHook, callHook } from '@/components/Hooks';
import config from '@/config';
import { setCommonParams } from '@/layouts/Routes';
import zhCN from '@/locales/zh-CN';
import Portal from '@ant-design/react-native/es/portal';
import Toast from '@ant-design/react-native/es/toast';
import template from 'lodash/template';
import { AsyncStorage } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { IdAsMsg, locales, LocaleType } from './consts';

export * from './consts';

export function matchLocale(localeName?: any, defaultValue: LocaleType = 'zh-CN'): LocaleType {
  if (typeof localeName !== 'string') return defaultValue;
  const res = Object.entries(locales).find(l => l[1].match(localeName)) as [LocaleType, any];
  return res ? res[0] : defaultValue;
}

/**
 * match locale by device info
 * @default
 * 'zh-CN'
 */
export function getDeviceLocale(defaultValue: LocaleType = 'zh-CN'): LocaleType {
  return matchLocale(DeviceInfo.getDeviceLocale(), defaultValue);
}

/**
 * get current locale type
 */
export function getLocale(): LocaleType {
  return format.localeName;
}

export function setLocale(localeName: LocaleType) {
  const newLocaleName = matchLocale(localeName, format.localeName);
  if (newLocaleName === format.localeName) return;

  const toastKey = Toast.loading(upper('正在设置语言'), 0);
  const { storageKey = 'locale' } = config.intl;
  if (storageKey === false) {
    Portal.remove(toastKey);
    format.localeName = newLocaleName;
    callHook('onSetLocale');
    return;
  }

  AsyncStorage.setItem(storageKey, newLocaleName, err => {
    Portal.remove(toastKey);
    if (err) return Toast.fail(upper('设置语言失败'));
    format.localeName = newLocaleName;
    Hooks.onSetLocale(() => {
      Toast.success(upper('设置语言成功'));
    });
    callHook('onSetLocale', newLocaleName);
  });
}

type FormatText = (id: keyof typeof zhCN, values?: { [k: string]: any }) => string;

interface Format<T = string> {
  (id: keyof typeof zhCN, values?: { [k: string]: any }): T | string;
  localeName: LocaleType;
  upper: FormatText;
  upperAll: FormatText;
}

export const format: Format = (id, values) => {
  const locale = locales[format.localeName];
  let message: any = locale.data[id];
  // get locale text failed
  if (message === void 0) {
    if (__DEV__) {
      console.error(`[intl] Get '${format.localeName}' locale text of '${id}' failed.`);
    }
    return id;
  }
  // use id as fomatted message
  if (message === IdAsMsg) {
    message = id;
  }
  // format template
  if (values) {
    // cache template executor
    if (!locale.template[id]) {
      locale.template[id] = template(message);
    }
    message = locale.template[id]!(values);
  }
  return message;
};

export const upper: FormatText = (id, value) => {
  const locale = locales[format.localeName];
  const message = format(id, value);
  if (!locale.upperCase || typeof message !== 'string' || !message.length) {
    return message;
  }
  return `${message[0].toUpperCase()}${message.slice(1)}`;
};

export const upperAll: FormatText = (id, value) => {
  const locale = locales[format.localeName];
  const message = format(id, value);
  if (!locale.upperCase || typeof message !== 'string') {
    return message;
  }
  return message.toUpperCase();
};

/**
 ** *****************
 ** INIT `intl` START
 ** *****************
 */
format.upper = upper;
format.upperAll = upperAll;
registerHook('onSetLocale');
format.localeName = matchLocale(config.intl.default);
Hooks.onSetLocale((locale: LocaleType) => {
  setCommonParams({ locale });
  return true;
});

if (config.intl.deviceInfo) {
  format.localeName = getDeviceLocale(format.localeName);
}
if (config.intl.storageKey !== false) {
  Hooks.onDidMount(() => {
    AsyncStorage.getItem(config.intl.storageKey || 'locale', (err, res) => {
      if (err) return;
      const newLocaleName = matchLocale(res, format.localeName);
      if (newLocaleName === format.localeName) return;
      format.localeName = newLocaleName;
      callHook('onSetLocale', newLocaleName);
    });
  });
}
/**
 ** ***************
 ** INIT `intl` END
 ** ***************
 */

export default format;

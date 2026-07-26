import {initializeApp} from "firebase-admin/app";

initializeApp();

export {registerPushDevice} from "./features/push/registerPushDevice";
export {unregisterPushDevice} from "./features/push/unregisterPushDevice";
export {getPushDeviceStatus} from "./features/push/getPushDeviceStatus";
export {onEintragHistoryCreated} from "./features/push/onEintragHistoryCreated";

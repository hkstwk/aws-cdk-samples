
export interface IConstants {
    CLAMAV_TIMEOUT: number
    EXPIRATION_DAYS: number
}
export const constants : IConstants = {
    CLAMAV_TIMEOUT: 900_000, // 15 mins expressed in ms: 1000 * 60 * 15
    EXPIRATION_DAYS: 14
}

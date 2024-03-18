export interface IConstants {
    CLAMAV_TIMEOUT: number
}

export const constants : IConstants = {
    CLAMAV_TIMEOUT: 900_000 // 15 mins expressed in ms: 1000 * 60 * 15
}
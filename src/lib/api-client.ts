import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ErrorCodes } from '@/common/constants/error-codes';
import { ApiError } from '@/common/errors/api-error';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '@/common/types/api.types';
import { clientEnv } from '@/config/env.client';
import { shouldAttemptTokenRefresh } from '@/lib/api-auth';
import { isApiEnvelope, unwrapApiResponse } from '@/lib/api-response';

type AuthStoreGetter = () => {
  accessToken: string | null;
  refreshToken: () => Promise<void>;
  clearAuth: () => void;
};

let authStoreGetter: AuthStoreGetter | null = null;

export function setAuthStoreGetter(getter: AuthStoreGetter): void {
  authStoreGetter = getter;
}

function getBaseUrl(): string {
  if (clientEnv.featureApiProxy) {
    return '/api';
  }
  return clientEnv.apiUrl;
}

let refreshPromise: Promise<void> | null = null;

async function tryRefreshToken(): Promise<void> {
  if (!authStoreGetter) {
    throw new ApiError({
      code: ErrorCodes.UNAUTHORIZED,
      message: 'Not authenticated',
    });
  }

  if (!refreshPromise) {
    refreshPromise = authStoreGetter()
      .refreshToken()
      .finally(() => {
        refreshPromise = null;
      });
  }

  await refreshPromise;
}

function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = authStoreGetter?.().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const body = response.data;
      if (isApiEnvelope(body)) {
        return { ...response, data: unwrapApiResponse(body) };
      }
      return response;
    },
    async (error) => {
      const status = error.response?.status as number | undefined;
      const data = error.response?.data as ApiErrorResponse | undefined;
      const originalConfig = error.config as AxiosRequestConfig & { _retry?: boolean };
      const requestUrl = originalConfig?.url;

      if (
        shouldAttemptTokenRefresh({
          status,
          errorCode: data?.error?.code,
          url: requestUrl,
          alreadyRetried: !!originalConfig?._retry,
          featureAuth: clientEnv.featureAuth,
        }) &&
        authStoreGetter &&
        originalConfig
      ) {
        originalConfig._retry = true;
        try {
          await tryRefreshToken();
          return instance.request(originalConfig);
        } catch {
          authStoreGetter().clearAuth();
        }
      }

      if (data?.error) {
        throw new ApiError(data.error, status);
      }

      throw ApiError.fromUnknown(error, status);
    },
  );

  return instance;
}

const axiosInstance = createAxiosInstance();

export const api = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.get<T>(url, config).then((res) => res.data);
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.post<T>(url, data, config).then((res) => res.data);
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.put<T>(url, data, config).then((res) => res.data);
  },

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.patch<T>(url, data, config).then((res) => res.data);
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.delete<T>(url, config).then((res) => res.data);
  },
};

export type { ApiSuccessResponse, ApiErrorResponse };

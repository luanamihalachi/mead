class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toBody() {
    return {
      error: { code: this.code, message: this.message, details: this.details },
    };
  }
}

function BadRequest(message = "Bad request", details) {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

function NotFound(message = "Not found", details) {
  return new ApiError(404, "NOT_FOUND", message, details);
}

function UpstreamError(message = "Upstream error", details) {
  return new ApiError(502, "UPSTREAM_ERROR", message, details);
}

module.exports = { ApiError, BadRequest, NotFound, UpstreamError };

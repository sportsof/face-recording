namespace IdxFaceRecordingApi.Models;

public class LivenessResponse
{
    public bool Alive { get; set; }
    
    public string? Photo { get; set; }

    public string? Message { get; set; }

    public LivenessResponse()
    {
    }

    public LivenessResponse(string message)
    {
        Message = message;
    }
}
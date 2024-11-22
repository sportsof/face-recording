namespace IdxFaceRecordingApi.Models;

public class LivelinessResponse
{
    public int ResultCode { get; set; }
    
    public string ResultMessage { get; set; }
    
    public string OperationToken { get; set; }
    
    public bool Alive { get; set; }
    
    public string Photo { get; set; }
}
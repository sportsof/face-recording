using System.Net.Http.Headers;
using IdxFaceRecordingApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace IdxFaceRecordingApi.Controllers;

[Route("api/[controller]/[action]")]
[ApiController]
public class FaceRecordingController : ControllerBase
{
    private readonly ILogger<FaceRecordingController> _logger;

    private readonly string IdxAccessKey;
    
    private readonly string IdxSecretKey;

    private const string LivelinessApiUrl = "https://api.id-x.org/idx/api2/liveness/check";
    
    public FaceRecordingController(IConfiguration configuration, ILogger<FaceRecordingController> logger)
    {
        _logger = logger;

        IdxAccessKey = configuration.GetValue<string>("idx:accessKey")!;
        IdxSecretKey = configuration.GetValue<string>("idx:secretKey")!;
    }

    [HttpPost]
    public async Task<LivenessResponse> CheckVideo([FromForm]FaceRecordRequest? request)
    {
        if (request?.Video is null || request.Video.Length == 0)
            return new LivenessResponse("Ошибка загрузки видео");
        
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "uploads");

        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, $"video_{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}");
        await using var stream = new FileStream(filePath, FileMode.Create);
        await request.Video.CopyToAsync(stream);
        stream.Close();
        
        var client = new HttpClient();
        var content = new MultipartFormDataContent
        {
            { new StringContent(IdxSecretKey), "secretKey" },
            { new StringContent(IdxAccessKey), "accessKey" }
        };
        await using var videoStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        var videoContent = new StreamContent(videoStream);
        videoContent.Headers.ContentType = MediaTypeHeaderValue.Parse("video/mp4");
        content.Add(videoContent, "video", "video.mp4");

        try
        {
            var response = await client.PostAsync(LivelinessApiUrl, content);
            var responseText = await response.Content.ReadAsStringAsync();
            var responseData = await response.Content.ReadFromJsonAsync<IdxLivenessResponse>();

            _logger.LogInformation($"Результат определения живости: {responseData.Alive}");

            return new LivenessResponse
            {
                Alive = responseData.Alive,
                Photo = responseData.Photo
            };
        }
        catch(Exception ex)
        {
            _logger.LogError($"Проверка завершилась ошибкой: {ex.Message}");

            return new LivenessResponse(ex.Message);
        }
    }
}
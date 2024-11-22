using System.Net.Http.Headers;
using IdxFaceRecordingApi.Models;
using Microsoft.AspNetCore.Mvc;

namespace IdxFaceRecordingApi.Controllers;

[Route("api/[controller]/[action]")]
[ApiController]
public class FaceRecordingController : ControllerBase
{
    private readonly string IdxAccessKey;
    
    private readonly string IdxSecretKey;

    private const string LivelinessApiUrl = "https://api.id-x.org/idx/api2/liveness/check";
    
    public FaceRecordingController(IConfiguration configuration)
    {
        IdxAccessKey = configuration.GetValue<string>("idx:accessKey")!;
        IdxSecretKey = configuration.GetValue<string>("idx:secretKey")!;
    }

    [HttpPost]
    public async Task<IActionResult> CheckVideo([FromForm]FaceRecordRequest? request)
    {
        if (request?.Video is null || request.Video.Length == 0)
            return BadRequest("Не удалось загрузить видео.");
        
        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");

        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var filePath = Path.Combine(uploadsFolder, request.Video!.FileName);
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
        
        var response = await client.PostAsync(LivelinessApiUrl, content);
        var status = await response.Content.ReadAsStringAsync();
        var data = await response.Content.ReadFromJsonAsync<LivelinessResponse>();

        return Ok(new { alive = data.Alive, photo = data.Photo });
    }
}
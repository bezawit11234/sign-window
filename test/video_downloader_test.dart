import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:esl_learning_flutter/backend/services/video_downloader.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('builds fallback Google Drive download URLs for a file id', () {
    final urls = VideoDownloader.driveCandidateUrls('abc123');

    expect(urls.first, 'https://drive.google.com/uc?export=download&id=abc123');
    expect(
      urls,
      contains(
        'https://drive.google.com/uc?export=download&id=abc123&confirm=t',
      ),
    );
    expect(
      urls,
      contains('https://docs.google.com/uc?export=download&id=abc123'),
    );
  });

  test('refreshes a cached Drive URL after an authorization error', () async {
    SharedPreferences.setMockInitialValues({});
    const fileId = 'abc123';
    const expiredUrl = 'https://drive.google.com/expired';
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      'resolved_drive_$fileId',
      jsonEncode({
        'url': expiredUrl,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      }),
    );

    final adapter = _ExpiredUrlAdapter(expiredUrl);
    final dio = Dio()..httpClientAdapter = adapter;
    final downloader = VideoDownloader(dio: dio);
    final directory = await Directory.systemTemp.createTemp(
      'video-downloader-',
    );
    final destination = File(
      '${directory.path}${Platform.pathSeparator}$fileId.mp4',
    );

    try {
      await downloader.downloadVideoToFile(
        urlOrFileId: 'drive:$fileId',
        destinationPath: destination.path,
      );

      expect(await VideoDownloader.isValidVideoFile(destination), isTrue);
      expect(adapter.requestedUrls, contains(expiredUrl));
      expect(
        adapter.requestedUrls,
        contains(VideoDownloader.driveCandidateUrls(fileId).first),
      );
    } finally {
      await VideoDownloader.evictCachedUrl(fileId);
      dio.close(force: true);
      await directory.delete(recursive: true);
    }
  });
}

class _ExpiredUrlAdapter implements HttpClientAdapter {
  _ExpiredUrlAdapter(this.expiredUrl);

  final String expiredUrl;
  final List<String> requestedUrls = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final url = options.uri.toString();
    requestedUrls.add(url);
    if (url == expiredUrl) {
      return ResponseBody.fromString('expired', 403);
    }
    if (url == VideoDownloader.driveCandidateUrls('abc123').first) {
      final bytes = List<int>.filled(600, 0);
      bytes.setRange(4, 8, 'ftyp'.codeUnits);
      return ResponseBody.fromBytes(bytes, 200);
    }
    throw StateError('Unexpected URL in test: $url');
  }

  @override
  void close({bool force = false}) {}
}

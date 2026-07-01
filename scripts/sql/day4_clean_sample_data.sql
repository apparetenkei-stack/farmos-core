BEGIN;

SET ROLE farmos_app_local;

UPDATE knowledge.source_documents
SET
  title = '2024年 ブロッコリー ピクセル 作付けメモ',
  crop_name = 'ブロッコリー',
  field_name = 'A圃場',
  ocr_text = '2024年 ブロッコリー ピクセル 9/20播種 11/15定植 A圃場 秀品率高い 雨が多いと徒長'
WHERE id = 1;

UPDATE knowledge.extracted_facts
SET
  entity_name = 'ピクセル',
  fact_value_text = CASE
    WHEN fact_key = 'cultivar_note' THEN '秀品率高い。雨が多いと徒長。'
    ELSE fact_value_text
  END,
  fact_value_json = CASE
    WHEN fact_key = 'sowing_date' THEN
      jsonb_build_object(
        'crop', 'ブロッコリー',
        'cultivar', 'ピクセル',
        'field', 'A圃場',
        'sowing_date', '2024-09-20'
      )
    WHEN fact_key = 'transplant_date' THEN
      jsonb_build_object(
        'crop', 'ブロッコリー',
        'cultivar', 'ピクセル',
        'field', 'A圃場',
        'transplant_date', '2024-11-15'
      )
    WHEN fact_key = 'cultivar_note' THEN
      jsonb_build_object(
        'crop', 'ブロッコリー',
        'cultivar', 'ピクセル',
        'field', 'A圃場',
        'note', '秀品率高い。雨が多いと徒長。'
      )
    ELSE fact_value_json
  END
WHERE source_document_id = 1;

UPDATE knowledge.document_chunks
SET
  chunk_text = '2024年 ブロッコリー ピクセル。9/20播種。11/15定植。A圃場。秀品率高い。雨が多いと徒長。',
  chunk_metadata_json = jsonb_build_object(
    'crop', 'ブロッコリー',
    'cultivar', 'ピクセル',
    'field', 'A圃場',
    'season_year', 2024
  )
WHERE source_document_id = 1 AND chunk_index = 0;

UPDATE audit.knowledge_feedback
SET
  question = 'このメモから何が分かるか？',
  ai_answer = '2024年にブロッコリー品種ピクセルを9/20播種、11/15定植した可能性があります。',
  user_feedback = 'Day 4サンプルとして妥当。ただし人間確認前なので本番事実ではない。',
  correction_text = 'verified=false のまま保持する。'
WHERE id = 1;

RESET ROLE;

COMMIT;

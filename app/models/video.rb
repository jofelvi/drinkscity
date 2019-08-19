class Video < ApplicationRecord

  has_attached_file :clip, styles: {
            medium: {
                      :format => 'mp4'
            },
            thumb: { :geometry => "160x120", 
                        :format => 'jpeg', 
                        :time => 10}
             }, 
             processors: [:transcoder]
             # :storage => :s3,
             # :s3_credentials => "#{Rails.root}/config/s3.yml"

  # validates_attachment_content_type :clip, content_type: /\Avideo\/.*\Z/             
  validates_attachment :clip,
         content_type: { content_type: ['video/mp4']}


  before_post_process :skip_for_audio

  def skip_for_audio
    # ! %w(audio/ogg application/ogg).include?(asset_content_type)
  end

  before_post_process :image?
  def image?
  # !(data_content_type =~ /^image.*/).nil?
  end
end

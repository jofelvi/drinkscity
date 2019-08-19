
class VideoSerializer < ActiveModel::Serializer
  attributes :id, :title, :url
  
  def url
    object.clip.url(:medium)
  end
end

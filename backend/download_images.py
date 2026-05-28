from icrawler.builtin import GoogleImageCrawler

# Healthy crops
crawler = GoogleImageCrawler(storage={'root_dir': 'dataset/healthy'})
crawler.crawl(keyword='healthy crop field green plants', max_num=150)

# Drought damage
crawler = GoogleImageCrawler(storage={'root_dir': 'dataset/damaged'})
crawler.crawl(keyword='drought damaged crops dry field', max_num=100)

# Flood damage
crawler = GoogleImageCrawler(storage={'root_dir': 'dataset/damaged'})
crawler.crawl(keyword='flood damaged crops', max_num=100)

# Pest damage
crawler = GoogleImageCrawler(storage={'root_dir': 'dataset/damaged'})
crawler.crawl(keyword='pest damaged crops insects leaves', max_num=100)